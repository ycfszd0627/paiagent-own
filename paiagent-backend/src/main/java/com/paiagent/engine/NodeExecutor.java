package com.paiagent.engine;

import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;

public interface NodeExecutor {

    String execute(DAGNode node, ExecutionContext context, DAG dag);

    boolean supports(String nodeType);
}
