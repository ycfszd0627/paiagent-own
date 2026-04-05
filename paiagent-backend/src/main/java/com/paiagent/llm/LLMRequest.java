package com.paiagent.llm;

public record LLMRequest(
        String baseUrl,
        String apiKey,
        String model,
        String systemPrompt,
        String userMessage,
        double temperature,
        int maxTokens
) {}
