package com.paiagent.llm.adapters;

import com.paiagent.llm.OpenAICompatibleAdapter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "paiagent.llm.tongyi.api-key", matchIfMissing = false)
public class TongyiQianwenAdapter extends OpenAICompatibleAdapter {

    private final String defaultModel;

    public TongyiQianwenAdapter(
            @Value("${paiagent.llm.tongyi.base-url}") String baseUrl,
            @Value("${paiagent.llm.tongyi.api-key}") String apiKey,
            @Value("${paiagent.llm.tongyi.default-model}") String defaultModel) {
        super(baseUrl, apiKey);
        this.defaultModel = defaultModel;
    }

    @Override
    public String getProviderName() {
        return "tongyi";
    }

    @Override
    public String getDefaultModel() {
        return defaultModel;
    }
}
