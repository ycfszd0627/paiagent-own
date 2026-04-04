package com.paiagent.engine.executor;

import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeExecutor;
import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import org.springframework.stereotype.Component;

@Component
public class InputNodeExecutor implements NodeExecutor {

    @Override
    public String execute(DAGNode node, ExecutionContext context, DAG dag) {
        String input = context.getUserInput();
        context.put(node.nodeId(), input);
        return input;
    }

    @Override
    public boolean supports(String nodeType) {
        return "INPUT".equals(nodeType);
    }
}
