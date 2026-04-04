package com.paiagent.llm.adapters;

import com.paiagent.llm.OpenAICompatibleAdapter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "paiagent.llm.openai.api-key", matchIfMissing = false)
public class OpenAIAdapter extends OpenAICompatibleAdapter {

    private final String defaultModel;

    public OpenAIAdapter(
            @Value("${paiagent.llm.openai.base-url}") String baseUrl,
            @Value("${paiagent.llm.openai.api-key}") String apiKey,
            @Value("${paiagent.llm.openai.default-model}") String defaultModel) {
        super(baseUrl, apiKey);
        this.defaultModel = defaultModel;
    }

    @Override
    public String getProviderName() {
        return "openai";
    }

    @Override
    public String getDefaultModel() {
        return defaultModel;
    }
}
