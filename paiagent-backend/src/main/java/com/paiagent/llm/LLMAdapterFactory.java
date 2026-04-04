package com.paiagent.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@Slf4j
public class LLMAdapterFactory {

    private final Map<String, LLMAdapter> adapterMap;

    public LLMAdapterFactory(List<LLMAdapter> adapters) {
        this.adapterMap = adapters.stream()
                .collect(Collectors.toMap(LLMAdapter::getProviderName, Function.identity()));
        log.info("Loaded LLM adapters: {}", adapterMap.keySet());
    }

    public LLMAdapter getAdapter(String providerName) {
        return adapterMap.get(providerName);
    }

    public List<String> getAvailableProviders() {
        return List.copyOf(adapterMap.keySet());
    }
}
