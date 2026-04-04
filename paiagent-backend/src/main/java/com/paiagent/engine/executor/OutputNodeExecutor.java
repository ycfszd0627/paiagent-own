package com.paiagent.engine.executor;

import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeExecutor;
import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class OutputNodeExecutor implements NodeExecutor {

    @Override
    public String execute(DAGNode node, ExecutionContext context, DAG dag) {
        List<String> predecessors = dag.getPredecessors(node.nodeId());
        String output = predecessors.stream()
                .map(context::getAsString)
                .collect(Collectors.joining("\n"));
        context.put(node.nodeId(), output);
        return output;
    }

    @Override
    public boolean supports(String nodeType) {
        return "OUTPUT".equals(nodeType);
    }
}
