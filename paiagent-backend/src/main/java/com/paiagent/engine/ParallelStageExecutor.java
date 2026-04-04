package com.paiagent.engine;

import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import com.paiagent.exception.NodeExecutionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Executes nodes within a stage in parallel using Java 21 Virtual Threads.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ParallelStageExecutor {

    private final List<NodeExecutor> nodeExecutors;

    private static final ExecutorService VIRTUAL_EXECUTOR = Executors.newVirtualThreadPerTaskExecutor();

    public void executeStage(List<String> nodeIds, DAG dag, ExecutionContext context,
                             StageExecutionListener listener) {
        if (nodeIds.size() == 1) {
            executeSingleNode(nodeIds.getFirst(), dag, context, listener);
            return;
        }

        List<CompletableFuture<Void>> futures = nodeIds.stream()
                .map(nodeId -> CompletableFuture.runAsync(
                        () -> executeSingleNode(nodeId, dag, context, listener),
                        VIRTUAL_EXECUTOR
                ))
                .toList();

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (Exception e) {
            Throwable cause = e.getCause();
            if (cause instanceof NodeExecutionException nee) throw nee;
            throw new RuntimeException("Stage execution failed", cause != null ? cause : e);
        }
    }

    private void executeSingleNode(String nodeId, DAG dag, ExecutionContext context,
                                   StageExecutionListener listener) {
        DAGNode node = dag.getNode(nodeId);
        if (node == null) {
            throw new NodeExecutionException(nodeId, "Node not found in DAG");
        }

        if (listener != null) {
            listener.onNodeStart(nodeId, node.label());
        }

        long startTime = System.currentTimeMillis();
        NodeExecutor executor = findExecutor(node.nodeType());

        try {
            String result = executor.execute(node, context, dag);
            long duration = System.currentTimeMillis() - startTime;
            log.info("Node [{}] ({}) completed in {}ms", nodeId, node.label(), duration);
            if (listener != null) {
                listener.onNodeComplete(nodeId, node.label(), result, duration);
            }
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Node [{}] ({}) failed after {}ms: {}", nodeId, node.label(), duration, e.getMessage());
            if (listener != null) {
                listener.onNodeError(nodeId, node.label(), e.getMessage());
            }
            throw e;
        }
    }

    private NodeExecutor findExecutor(String nodeType) {
        return nodeExecutors.stream()
                .filter(e -> e.supports(nodeType))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No executor found for node type: " + nodeType));
    }

    public interface StageExecutionListener {
        void onNodeStart(String nodeId, String label);
        void onNodeComplete(String nodeId, String label, String output, long durationMs);
        void onNodeError(String nodeId, String label, String error);
    }
}
