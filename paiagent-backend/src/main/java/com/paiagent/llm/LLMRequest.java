package com.paiagent.llm;

public record LLMRequest(
        String model,
        String systemPrompt,
        String userMessage,
        double temperature,
        int maxTokens
) {}
