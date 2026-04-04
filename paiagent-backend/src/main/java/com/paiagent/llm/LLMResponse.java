package com.paiagent.llm;

public record LLMResponse(
        String content,
        int promptTokens,
        int completionTokens,
        String model
) {}
