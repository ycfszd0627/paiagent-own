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

    protected final WebClient webClient;

    protected OpenAICompatibleAdapter(String baseUrl, String apiKey) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Override
    public LLMResponse chat(LLMRequest request) {
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

        log.info("Calling {} with model: {}", getProviderName(), request.model());

        @SuppressWarnings("unchecked")
        Map<String, Object> response = webClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) {
            throw new RuntimeException("Empty response from " + getProviderName());
        }

        return parseResponse(response);
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
