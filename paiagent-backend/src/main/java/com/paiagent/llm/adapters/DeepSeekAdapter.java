package com.paiagent.llm.adapters;

import com.paiagent.llm.OpenAICompatibleAdapter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "paiagent.llm.deepseek.api-key", matchIfMissing = false)
public class DeepSeekAdapter extends OpenAICompatibleAdapter {

    private final String defaultModel;

    public DeepSeekAdapter(
            @Value("${paiagent.llm.deepseek.base-url}") String baseUrl,
            @Value("${paiagent.llm.deepseek.api-key}") String apiKey,
            @Value("${paiagent.llm.deepseek.default-model}") String defaultModel) {
        super(baseUrl, apiKey);
        this.defaultModel = defaultModel;
    }

    @Override
    public String getProviderName() {
        return "deepseek";
    }

    @Override
    public String getDefaultModel() {
        return defaultModel;
    }
}
