package com.paiagent.controller;

import com.paiagent.entity.LLMProvider;
import com.paiagent.repository.LLMProviderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/llm-providers")
@RequiredArgsConstructor
public class LLMProviderController {

    private final LLMProviderRepository llmProviderRepository;

    @GetMapping
    public List<Map<String, Object>> listProviders() {
        return llmProviderRepository.findAll().stream()
                .map(p -> Map.<String, Object>of(
                        "id", p.getId(),
                        "name", p.getName(),
                        "displayName", p.getDisplayName(),
                        "baseUrl", p.getBaseUrl(),
                        "defaultModel", p.getDefaultModel(),
                        "isEnabled", p.getIsEnabled()
                ))
                .toList();
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateProvider(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        LLMProvider provider = llmProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Provider not found: " + id));

        if (body.containsKey("apiKey")) provider.setApiKey((String) body.get("apiKey"));
        if (body.containsKey("baseUrl")) provider.setBaseUrl((String) body.get("baseUrl"));
        if (body.containsKey("defaultModel")) provider.setDefaultModel((String) body.get("defaultModel"));
        if (body.containsKey("isEnabled")) provider.setIsEnabled((Boolean) body.get("isEnabled"));

        llmProviderRepository.save(provider);
        return Map.of("message", "Updated successfully");
    }
}
