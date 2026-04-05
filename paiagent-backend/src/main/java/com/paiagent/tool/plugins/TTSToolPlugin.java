package com.paiagent.tool.plugins;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paiagent.storage.MinioStorageService;
import com.paiagent.tool.ToolPlugin;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.netty.http.client.HttpClient;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
@Slf4j
@RequiredArgsConstructor
public class TTSToolPlugin implements ToolPlugin {

    private final ObjectMapper objectMapper;
    private final MinioStorageService minioStorageService;

    @Value("${paiagent.tool.tts.base-url:https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation}")
    private String baseUrl;

    @Value("${paiagent.tool.tts.api-key:${TONGYI_API_KEY:${DASHSCOPE_API_KEY:}}}")
    private String defaultApiKey;

    @Value("${paiagent.tool.tts.timeout-seconds:90}")
    private long timeoutSeconds;

    @Value("${paiagent.tool.tts.max-input-chars:250}")
    private int maxInputChars;

    @Value("${paiagent.tool.tts.ffmpeg-path:ffmpeg}")
    private String ffmpegPath;

    @Value("${paiagent.tool.tts.parallelism:3}")
    private int parallelism;

    @Override
    public String execute(String input, Map<String, Object> config) {
        String resolvedBaseUrl = getString(config, "baseUrl", baseUrl);
        String model = getString(config, "model", "qwen3-tts-flash");
        String voice = getString(config, "voice", "Cherry");
        String languageType = getString(config, "language_type", "Auto");
        String apiKey = getString(config, "apiKey", defaultApiKey);

        if (apiKey.isBlank()) {
            throw new IllegalArgumentException("TTS API key is required");
        }

        List<String> chunks = splitForTts(input, maxInputChars);
        if (chunks.isEmpty()) {
            throw new IllegalArgumentException("TTS input is empty");
        }

        String timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS").format(LocalDateTime.now());
        String jobId = timestamp + "-" + UUID.randomUUID();
        log.info("TTS Plugin: processing {} chunk(s) for job {}", chunks.size(), jobId);

        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("paiagent-tts-" + jobId);

            List<ChunkResult> chunkResults = processChunksInParallel(
                    chunks, workDir, timestamp, resolvedBaseUrl, model, voice, languageType, apiKey
            );

            List<Path> normalizedChunkFiles = chunkResults.stream()
                    .sorted(Comparator.comparingInt(ChunkResult::index))
                    .map(ChunkResult::normalizedMp3)
                    .toList();

            List<Map<String, Object>> chunkDetails = chunkResults.stream()
                    .sorted(Comparator.comparingInt(ChunkResult::index))
                    .map(chunk -> Map.<String, Object>of(
                            "index", chunk.index(),
                            "text", chunk.text(),
                            "audioUrl", chunk.minioUrl()
                    ))
                    .toList();

            Path mergedMp3 = workDir.resolve("merged.mp3");
            mergeMp3Files(normalizedChunkFiles, workDir.resolve("concat.txt"), mergedMp3);

            String mergedObjectName = "tts/" + timestamp + "/merged/" + timestamp + "-merged.mp3";
            String mergedAudioUrl = minioStorageService.uploadFile(mergedMp3, mergedObjectName, "audio/mpeg");

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("type", "audio");
            result.put("provider", "qwen-tts");
            result.put("status", "generated");
            result.put("model", model);
            result.put("voice", voice);
            result.put("language_type", languageType);
            result.put("apiKeyMasked", maskApiKey(apiKey));
            result.put("jobId", jobId);
            result.put("chunkCount", chunks.size());
            result.put("chunks", chunkDetails);
            result.put("audioUrl", mergedAudioUrl);
            result.put("text", truncate(input, 100));

            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize TTS result", e);
        } catch (Exception e) {
            throw new RuntimeException("TTS provider call failed at " + resolvedBaseUrl + ": " + e.getMessage(), e);
        } finally {
            if (workDir != null) {
                deleteRecursively(workDir);
            }
        }
    }

    @Override
    public String getToolName() {
        return "tts";
    }

    @Override
    public String getDisplayName() {
        return "超拟人音频合成";
    }

    private List<ChunkResult> processChunksInParallel(
            List<String> chunks,
            Path workDir,
            String timestamp,
            String resolvedBaseUrl,
            String model,
            String voice,
            String languageType,
            String apiKey) {
        ExecutorService executor = Executors.newFixedThreadPool(Math.max(1, parallelism));
        try {
            List<CompletableFuture<ChunkResult>> futures = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++) {
                int chunkIndex = i + 1;
                String chunkText = chunks.get(i);
                futures.add(CompletableFuture.supplyAsync(
                        () -> processSingleChunk(chunkIndex, chunkText, workDir, timestamp, resolvedBaseUrl, model, voice, languageType, apiKey),
                        executor
                ));
            }
            return futures.stream()
                    .map(CompletableFuture::join)
                    .toList();
        } finally {
            executor.shutdown();
        }
    }

    private ChunkResult processSingleChunk(
            int chunkIndex,
            String chunkText,
            Path workDir,
            String timestamp,
            String resolvedBaseUrl,
            String model,
            String voice,
            String languageType,
            String apiKey) {
        String sourceAudioUrl = requestTtsAudioUrl(resolvedBaseUrl, model, voice, languageType, apiKey, chunkText);
        Path downloadedFile = downloadAudio(sourceAudioUrl, workDir.resolve("chunk-" + chunkIndex + "-source.bin"));
        Path normalizedMp3 = workDir.resolve("chunk-" + chunkIndex + ".mp3");
        convertToMp3(downloadedFile, normalizedMp3);

        String chunkObjectName = "tts/" + timestamp + "/chunks/" + timestamp + "-chunk-" + chunkIndex + ".mp3";
        String chunkMinioUrl = minioStorageService.uploadFile(normalizedMp3, chunkObjectName, "audio/mpeg");

        return new ChunkResult(chunkIndex, chunkText, normalizedMp3, chunkMinioUrl);
    }

    private String requestTtsAudioUrl(String resolvedBaseUrl, String model, String voice, String languageType, String apiKey, String ttsInput) {
        log.info("TTS Plugin: calling DashScope model={}, voice={}, language_type={}, inputChars={}",
                model, voice, languageType, ttsInput.length());

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "input", Map.of(
                        "text", ttsInput,
                        "voice", voice,
                        "language_type", languageType
                )
        );

        try {
            HttpClient httpClient = HttpClient.create()
                    .responseTimeout(Duration.ofSeconds(timeoutSeconds));

            String responseBody = WebClient.builder()
                    .baseUrl(resolvedBaseUrl)
                    .clientConnector(new ReactorClientHttpConnector(httpClient))
                    .defaultHeader("Authorization", "Bearer " + apiKey)
                    .defaultHeader("Content-Type", "application/json")
                    .build()
                    .post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .block();

            if (responseBody == null || responseBody.isBlank()) {
                throw new RuntimeException("Empty response from TTS provider");
            }

            JsonNode root = objectMapper.readTree(responseBody);
            String audioUrl = firstNonBlank(
                    textAt(root, "/output/audio/url"),
                    textAt(root, "/output/audio_url"),
                    textAt(root, "/audio/url"),
                    textAt(root, "/audio_url")
            );
            if (audioUrl.isBlank()) {
                throw new RuntimeException("TTS response does not contain audioUrl: " + responseBody);
            }
            return audioUrl;
        } catch (WebClientResponseException e) {
            throw new RuntimeException("HTTP " + e.getStatusCode().value() + " " + e.getResponseBodyAsString(), e);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse TTS provider response", e);
        } catch (Exception e) {
            throw new RuntimeException("Request failed after " + timeoutSeconds + "s timeout: " + e.getMessage(), e);
        }
    }

    private Path downloadAudio(String audioUrl, Path targetFile) {
        try {
            java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                    .followRedirects(java.net.http.HttpClient.Redirect.NORMAL)
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(audioUrl))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String body = new String(response.body(), StandardCharsets.UTF_8);
                throw new RuntimeException("HTTP " + response.statusCode() + " " + body);
            }

            byte[] bytes = response.body();
            if (bytes == null || bytes.length == 0) {
                throw new RuntimeException("Downloaded audio is empty");
            }
            Files.write(targetFile, bytes);
            return targetFile;
        } catch (Exception e) {
            throw new RuntimeException("Failed to download TTS audio from " + audioUrl + ": " + e.getMessage(), e);
        }
    }

    private void convertToMp3(Path inputFile, Path outputFile) {
        runFfmpeg(List.of(
                ffmpegPath,
                "-y",
                "-i", inputFile.toString(),
                "-ac", "1",
                "-ar", "24000",
                "-b:a", "128k",
                outputFile.toString()
        ), "Failed to convert audio chunk to mp3");
    }

    private void mergeMp3Files(List<Path> chunkFiles, Path concatFile, Path outputFile) {
        try {
            List<String> lines = new ArrayList<>();
            for (Path chunkFile : chunkFiles) {
                lines.add("file '" + chunkFile.toAbsolutePath().toString().replace("'", "'\\''") + "'");
            }
            Files.write(concatFile, lines, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to prepare ffmpeg concat file", e);
        }

        runFfmpeg(List.of(
                ffmpegPath,
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concatFile.toString(),
                "-c", "copy",
                outputFile.toString()
        ), "Failed to merge audio chunks");
    }

    private void runFfmpeg(List<String> command, String errorMessage) {
        try {
            Process process = new ProcessBuilder(command)
                    .redirectErrorStream(true)
                    .start();
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException(errorMessage + ": " + output);
            }
        } catch (Exception e) {
            throw new RuntimeException(errorMessage, e);
        }
    }

    private List<String> splitForTts(String text, int maxLen) {
        String normalized = text == null ? "" : text.trim().replaceAll("\\s+", " ");
        List<String> result = new ArrayList<>();
        if (normalized.isEmpty()) {
            return result;
        }

        StringBuilder current = new StringBuilder();
        String[] sentences = normalized.split("(?<=[。！？；.!?])");
        for (String sentence : sentences) {
            String trimmed = sentence.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            if (trimmed.length() > maxLen) {
                if (!current.isEmpty()) {
                    result.add(current.toString().trim());
                    current.setLength(0);
                }
                splitLongSentence(trimmed, maxLen, result);
                continue;
            }

            if (current.isEmpty()) {
                current.append(trimmed);
                continue;
            }

            if (current.length() + 1 + trimmed.length() <= maxLen) {
                current.append(' ').append(trimmed);
            } else {
                result.add(current.toString().trim());
                current.setLength(0);
                current.append(trimmed);
            }
        }

        if (!current.isEmpty()) {
            result.add(current.toString().trim());
        }
        return result;
    }

    private void splitLongSentence(String sentence, int maxLen, List<String> result) {
        int start = 0;
        while (start < sentence.length()) {
            int end = Math.min(start + maxLen, sentence.length());
            int preferred = findPreferredCutIndex(sentence.substring(start, end), Math.min(maxLen, end - start));
            int actualEnd = start + preferred;
            if (actualEnd <= start) {
                actualEnd = end;
            }
            result.add(sentence.substring(start, actualEnd).trim());
            start = actualEnd;
        }
    }

    private int findPreferredCutIndex(String text, int maxLen) {
        String preferredBreaks = "。！？；;.!?，,";
        for (int i = Math.min(maxLen, text.length()) - 1; i >= Math.max(1, maxLen / 2); i--) {
            if (preferredBreaks.indexOf(text.charAt(i)) >= 0) {
                return i + 1;
            }
        }
        int whitespaceIndex = text.lastIndexOf(' ', maxLen - 1);
        if (whitespaceIndex >= maxLen / 2) {
            return whitespaceIndex;
        }
        return Math.min(maxLen, text.length());
    }

    private String textAt(JsonNode root, String jsonPointer) {
        JsonNode node = root.at(jsonPointer);
        return node.isMissingNode() || node.isNull() ? "" : node.asText("");
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String getString(Map<String, Object> config, String key, String defaultValue) {
        Object value = config.get(key);
        if (value == null) {
            return defaultValue;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? defaultValue : text;
    }

    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }
        if (apiKey.length() <= 8) {
            return "*".repeat(apiKey.length());
        }
        return apiKey.substring(0, 4) + "****" + apiKey.substring(apiKey.length() - 4);
    }

    private String truncate(String text, int maxLen) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxLen) {
            return text;
        }
        return text.substring(0, maxLen) + "...";
    }

    private void deleteRecursively(Path path) {
        try {
            if (!Files.exists(path)) {
                return;
            }
            Files.walk(path)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException e) {
                            log.warn("Failed to delete temp path {}: {}", p, e.getMessage());
                        }
                    });
        } catch (IOException e) {
            log.warn("Failed to clean temp directory {}: {}", path, e.getMessage());
        }
    }

    private record ChunkResult(int index, String text, Path normalizedMp3, String minioUrl) {}
}
