package com.paiagent.engine.executor;

import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeExecutor;
import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import com.paiagent.exception.NodeExecutionException;
import com.paiagent.tool.ToolPlugin;
import com.paiagent.tool.ToolPluginRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ToolNodeExecutor implements NodeExecutor {

    private final ToolPluginRegistry toolPluginRegistry;

    @Override
    public String execute(DAGNode node, ExecutionContext context, DAG dag) {
        String subtype = node.nodeSubtype();
        ToolPlugin plugin = toolPluginRegistry.getPlugin(subtype);
        if (plugin == null) {
            throw new NodeExecutionException(node.nodeId(), "No tool plugin found for: " + subtype);
        }

        // Collect input from predecessors
        List<String> predecessors = dag.getPredecessors(node.nodeId());
        String upstreamInput = predecessors.stream()
                .map(context::getAsString)
                .collect(Collectors.joining("\n"));

        try {
            String result = plugin.execute(upstreamInput, node.config());
            context.put(node.nodeId(), result);
            return result;
        } catch (Exception e) {
            throw new NodeExecutionException(node.nodeId(), e.getMessage(), e);
        }
    }

    @Override
    public boolean supports(String nodeType) {
        return "TOOL".equals(nodeType);
    }
}
