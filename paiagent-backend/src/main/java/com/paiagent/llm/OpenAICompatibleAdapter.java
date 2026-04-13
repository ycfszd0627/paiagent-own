package com.paiagent.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Base adapter for all OpenAI-compatible LLM APIs.
 * DeepSeek and Tongyi Qianwen both support OpenAI-compatible endpoints.
 */
@Slf4j
public abstract class OpenAICompatibleAdapter implements LLMAdapter {

    private final String defaultBaseUrl;
    private final String defaultApiKey;
    protected final WebClient webClient;

    protected OpenAICompatibleAdapter(String baseUrl, String apiKey) {
        this.defaultBaseUrl = baseUrl;
        this.defaultApiKey = apiKey;
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public LLMResponse chat(LLMRequest request) {
        String resolvedBaseUrl = request.baseUrl() != null && !request.baseUrl().isBlank()
                ? request.baseUrl()
                : defaultBaseUrl;
        String resolvedApiKey = request.apiKey() != null && !request.apiKey().isBlank()
                ? request.apiKey()
                : defaultApiKey;

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.systemPrompt() != null && !request.systemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.systemPrompt()));
        }
        messages.add(Map.of("role", "user", "content", request.userMessage()));

        Map<String, Object> body = Map.of(
                "model", request.model(),
                "messages", messages,
                "temperature", request.temperature(),
                "max_tokens", request.maxTokens()
        );

        log.info(
                "LLM request -> provider={}, baseUrl={}, model={}, temperature={}, maxTokens={}, apiKey={}, systemPrompt={}, userMessage={}",
                getProviderName(),
                resolvedBaseUrl,
                request.model(),
                request.temperature(),
                request.maxTokens(),
                maskApiKey(resolvedApiKey),
                truncate(request.systemPrompt(), 2000),
                truncate(request.userMessage(), 4000)
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> response = resolveWebClient(resolvedBaseUrl, resolvedApiKey).post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            throw new RuntimeException("Empty response from " + getProviderName());
        }

        LLMResponse parsedResponse = parseResponse(response);
        log.info(
                "LLM response <- provider={}, model={}, promptTokens={}, completionTokens={}, content={}",
                getProviderName(),
                parsedResponse.model(),
                parsedResponse.promptTokens(),
                parsedResponse.completionTokens(),
                truncate(parsedResponse.content(), 4000)
        );

        return parsedResponse;
    }

    private WebClient resolveWebClient(String baseUrl, String apiKey) {
        if (baseUrl.equals(defaultBaseUrl) && apiKey.equals(defaultApiKey)) {
            return webClient;
        }

        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    private String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "<empty>";
        }
        if (apiKey.length() <= 8) {
            return "***";
        }
        return apiKey.substring(0, 4) + "***" + apiKey.substring(apiKey.length() - 4);
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...(truncated)";
    }

    @SuppressWarnings("unchecked")
    private LLMResponse parseResponse(Map<String, Object> response) {
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("No choices in response from " + getProviderName());
        }

        Map<String, Object> message = (Map<String, Object>) choices.getFirst().get("message");
        String content = (String) message.get("content");

        int promptTokens = 0;
        int completionTokens = 0;
        Map<String, Object> usage = (Map<String, Object>) response.get("usage");
        if (usage != null) {
            promptTokens = ((Number) usage.getOrDefault("prompt_tokens", 0)).intValue();
            completionTokens = ((Number) usage.getOrDefault("completion_tokens", 0)).intValue();
        }

        String model = (String) response.getOrDefault("model", "");

        return new LLMResponse(content, promptTokens, completionTokens, model);
    }
}
