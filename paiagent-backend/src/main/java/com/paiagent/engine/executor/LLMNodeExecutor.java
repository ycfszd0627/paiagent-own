package com.paiagent.engine.executor;

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
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class LLMNodeExecutor implements NodeExecutor {

    private final LLMAdapterFactory llmAdapterFactory;

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
        double temperature = config.containsKey("temperature")
                ? ((Number) config.get("temperature")).doubleValue()
                : 0.7;
        int maxTokens = config.containsKey("maxTokens")
                ? ((Number) config.get("maxTokens")).intValue()
                : 2048;

        LLMRequest request = new LLMRequest(baseUrl, apiKey, model, systemPrompt, upstreamInput, temperature, maxTokens);

        try {
            LLMResponse response = adapter.chat(request);
            String result = response.content();
            context.put(node.nodeId(), result);
            return result;
        } catch (Exception e) {
            throw new NodeExecutionException(node.nodeId(), e.getMessage(), e);
        }
    }

    @Override
    public boolean supports(String nodeType) {
        return "LLM".equals(nodeType);
    }
}
