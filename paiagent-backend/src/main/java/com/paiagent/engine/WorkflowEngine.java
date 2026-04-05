package com.paiagent.engine;

import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import com.paiagent.entity.Workflow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WorkflowEngine {

    private final DAGParser dagParser;
    private final TopologicalSorter topologicalSorter;
    private final ParallelStageExecutor parallelStageExecutor;

    /**
     * Execute a workflow synchronously.
     */
    public String execute(Workflow workflow, String userInput) {
        return execute(workflow, userInput, null);
    }

    /**
     * Execute a workflow with an optional listener for SSE streaming.
     */
    public String execute(Workflow workflow, String userInput,
                          ParallelStageExecutor.StageExecutionListener listener) {
        Long workflowId = workflow.getId();

        log.info("Starting execution of workflow [{}] '{}'", workflowId, workflow.getName());

        // 1. Parse into DAG
        DAG dag = dagParser.parse(workflow.getNodes(), workflow.getEdges());

        // 2. Topological sort
        ExecutionPlan plan = topologicalSorter.sort(dag);

        // 3. Create execution context
        ExecutionContext context = new ExecutionContext(userInput);

        // 4. Execute stage by stage
        for (List<String> stage : plan.stages()) {
            parallelStageExecutor.executeStage(stage, dag, context, listener);
        }

        // 5. Find output node and return its result
        String finalOutput = dag.getAllNodes().stream()
                .filter(n -> "OUTPUT".equals(n.nodeType()))
                .map(DAGNode::nodeId)
                .map(context::getAsString)
                .findFirst()
                .orElse("");

        log.info("Workflow [{}] execution completed. Output length: {}", workflowId, finalOutput.length());
        return finalOutput;
    }
}
