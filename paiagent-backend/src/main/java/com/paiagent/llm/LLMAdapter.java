package com.paiagent.llm;

public interface LLMAdapter {

    LLMResponse chat(LLMRequest request);

    String getProviderName();

    String getDefaultModel();
}
