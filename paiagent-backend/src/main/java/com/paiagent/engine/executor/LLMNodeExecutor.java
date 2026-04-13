package com.paiagent.engine.executor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeExecutor;
import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import com.paiagent.exception.NodeExecutionException;
import com.paiagent.llm.LLMAdapter;
import com.paiagent.llm.LLMAdapterFactory;
import com.paiagent.llm.LLMRequest;
import com.paiagent.llm.LLMResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class LLMNodeExecutor implements NodeExecutor {

    private final LLMAdapterFactory llmAdapterFactory;
    private final ObjectMapper objectMapper;

    @Override
    public String execute(DAGNode node, ExecutionContext context, DAG dag) {
        String subtype = node.nodeSubtype();
        LLMAdapter adapter = llmAdapterFactory.getAdapter(subtype);
        if (adapter == null) {
            throw new NodeExecutionException(node.nodeId(), "No LLM adapter found for: " + subtype);
        }

        // Collect input from predecessors
        List<String> predecessors = dag.getPredecessors(node.nodeId());
        String upstreamInput = predecessors.stream()
                .map(context::getAsString)
                .collect(Collectors.joining("\n"));

        // Build LLM request from node config
        var config = node.config();
        String baseUrl = (String) config.getOrDefault("baseUrl", "");
        String apiKey = (String) config.getOrDefault("apiKey", "");
        String model = (String) config.getOrDefault("model", adapter.getDefaultModel());
        String systemPrompt = (String) config.getOrDefault("systemPrompt", "");
        String outputMode = (String) config.getOrDefault("outputMode", "text");
        double temperature = config.containsKey("temperature")
                ? ((Number) config.get("temperature")).doubleValue()
                : 0.7;
        int maxTokens = config.containsKey("maxTokens")
                ? ((Number) config.get("maxTokens")).intValue()
                : 2048;

        String mergedInput = mergeAdditionalInputs(upstreamInput, config.get("additionalInputs"), context);

        String finalSystemPrompt = "json".equalsIgnoreCase(outputMode)
                ? enrichJsonSystemPrompt(systemPrompt, config)
                : systemPrompt;

        LLMRequest request = new LLMRequest(baseUrl, apiKey, model, finalSystemPrompt, mergedInput, temperature, maxTokens);

        try {
            LLMResponse response = adapter.chat(request);
            String result = response.content();
            context.put(node.nodeId(), result);
            if ("json".equalsIgnoreCase(outputMode)) {
                extractStructuredOutputs(node, context, result, config);
            }
            return result;
        } catch (Exception e) {
            throw new NodeExecutionException(node.nodeId(), e.getMessage(), e);
        }
    }

    @Override
    public boolean supports(String nodeType) {
        return "LLM".equals(nodeType);
    }

    @SuppressWarnings("unchecked")
    private String enrichJsonSystemPrompt(String systemPrompt, Map<String, Object> config) {
        Object outputParamsObj = config.get("outputParams");
        if (!(outputParamsObj instanceof List<?> outputParams) || outputParams.isEmpty()) {
            return systemPrompt + "\n\n请仅返回合法 JSON 对象，不要输出 Markdown，不要输出额外解释。";
        }

        String fields = outputParams.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(param -> {
                    String name = asString(param.get("name"));
                    String description = asString(param.get("description"));
                    if (name == null) {
                        return null;
                    }
                    return description == null || description.isBlank()
                            ? "- " + name
                            : "- " + name + ": " + description;
                })
                .filter(item -> item != null && !item.isBlank())
                .collect(Collectors.joining("\n"));

        return (systemPrompt == null ? "" : systemPrompt) +
                "\n\n请严格输出 JSON 对象，不要输出 Markdown，不要输出额外解释。" +
                "\n必须包含以下字段：\n" + fields;
    }

    @SuppressWarnings("unchecked")
    private void extractStructuredOutputs(
            DAGNode node,
            ExecutionContext context,
            String result,
            Map<String, Object> config
    ) {
        Map<String, Object> json;
        try {
            json = objectMapper.readValue(result, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new NodeExecutionException(
                    node.nodeId(),
                    "LLM node configured for JSON output but model did not return valid JSON",
                    e
            );
        }

        context.putGlobal("structuredOutput", json);

        Object outputParamsObj = config.get("outputParams");
        if (!(outputParamsObj instanceof List<?> outputParams)) {
            return;
        }

        for (Object paramObj : outputParams) {
            if (!(paramObj instanceof Map<?, ?> rawParam)) {
                continue;
            }
            String name = asString(rawParam.get("name"));
            if (name == null) {
                continue;
            }
            String jsonPath = asString(rawParam.get("jsonPath"));
            Object value = resolveJsonPath(json, jsonPath != null ? jsonPath : name);
            if (value != null) {
                context.putGlobal(name, value);
                context.putGlobal(node.nodeId() + "." + name, value);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Object resolveJsonPath(Map<String, Object> source, String path) {
        if (source == null || path == null || path.isBlank()) {
            return null;
        }

        Object current = source;
        for (String key : path.split("\\.")) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = ((Map<String, Object>) map).get(key);
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String str = value.toString().trim();
        return str.isEmpty() ? null : str;
    }

    @SuppressWarnings("unchecked")
    private String mergeAdditionalInputs(String upstreamInput, Object additionalInputsObj, ExecutionContext context) {
        if (!(additionalInputsObj instanceof List<?> additionalInputs) || additionalInputs.isEmpty()) {
            return upstreamInput;
        }

        String appendedInputs = additionalInputs.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(input -> {
                    String variablePath = asString(input.get("variablePath"));
                    if (variablePath == null) {
                        return null;
                    }
                    Object resolvedValue = context.resolveReference(variablePath);
                    if (resolvedValue == null) {
                        return null;
                    }
                    String label = asString(input.get("label"));
                    return (label != null ? label : variablePath) + ": " + resolvedValue;
                })
                .filter(item -> item != null && !item.isBlank())
                .collect(Collectors.joining("\n"));

        if (appendedInputs.isBlank()) {
            return upstreamInput;
        }
        if (upstreamInput == null || upstreamInput.isBlank()) {
            return appendedInputs;
        }
        return upstreamInput + "\n" + appendedInputs;
    }
}
