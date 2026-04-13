package com.paiagent.engine;

import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import com.paiagent.entity.Workflow;
import com.paiagent.exception.NodeExecutionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.GraphStateException;
import org.bsc.langgraph4j.StateGraph;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.PatternSyntaxException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

@Component
@RequiredArgsConstructor
@Slf4j
public class LangGraph4jWorkflowEngine implements WorkflowExecutionEngine {

    private static final int DEFAULT_MAX_STEPS = 32;
    private static final Pattern NEXT_NODE_PATTERN = Pattern.compile("(?m)^NEXT:\\s*([\\w-]+)\\s*$");
    private static final Pattern NEXT_LABEL_PATTERN = Pattern.compile("(?m)^NEXT_LABEL:\\s*(.+?)\\s*$");

    private final DAGParser dagParser;
    private final List<NodeExecutor> nodeExecutors;

    @Override
    public String getFrameworkType() {
        return WorkflowFrameworkType.LANGGRAPH4J;
    }

    @Override
    public String execute(Workflow workflow, String userInput) {
        return execute(workflow, userInput, null);
    }

    @Override
    public String execute(Workflow workflow, String userInput, ParallelStageExecutor.StageExecutionListener listener) {
        Long workflowId = workflow.getId();
        log.info("Starting LangGraph4j execution of workflow [{}] '{}'", workflowId, workflow.getName());

        DAG dag = dagParser.parse(workflow.getNodes(), workflow.getEdges());
        ExecutionContext context = new ExecutionContext(userInput);
        StateGraph<LangGraph4jExecutionState> stateGraph = buildStateGraph(dag, context, listener);

        try {
            var compiledGraph = stateGraph.compile();
            compiledGraph.setMaxIterations(DEFAULT_MAX_STEPS);
            Map<String, Object> initialState = new HashMap<>();
            initialState.put("userInput", userInput);

            for (var ignored : compiledGraph.stream(initialState)) {
                // Streaming the graph drives execution; node outputs are written to ExecutionContext.
            }
        } catch (Exception e) {
            throw new RuntimeException("LangGraph4j workflow execution failed", e);
        }

        String finalOutput = dag.getAllNodes().stream()
                .filter(n -> "OUTPUT".equals(n.nodeType()))
                .map(DAGNode::nodeId)
                .map(context::getAsString)
                .findFirst()
                .orElseGet(() -> context.getAsString("finalOutput"));

        log.info("LangGraph4j workflow [{}] execution completed. Output length: {}", workflowId, finalOutput.length());
        return finalOutput;
    }

    private StateGraph<LangGraph4jExecutionState> buildStateGraph(
            DAG dag,
            ExecutionContext context,
            ParallelStageExecutor.StageExecutionListener listener
    ) {
        StateGraph<LangGraph4jExecutionState> graph = new StateGraph<>(LangGraph4jExecutionState::new);

        AtomicInteger executedSteps = new AtomicInteger();

        try {
            for (DAGNode node : dag.getAllNodes()) {
                graph.addNode(node.nodeId(), node_async(state -> executeNode(
                        node,
                        dag,
                        context,
                        listener,
                        executedSteps
                )));
            }

            for (String nodeId : dag.getNodeIds()) {
                List<String> successors = new ArrayList<>(dag.getSuccessors(nodeId));
                if (successors.isEmpty()) {
                    graph.addEdge(nodeId, END);
                    continue;
                }

                if (successors.size() == 1) {
                    graph.addEdge(nodeId, successors.getFirst());
                    continue;
                }

                Map<String, String> routes = new LinkedHashMap<>();
                for (String successor : successors) {
                    routes.put(successor, successor);
                }
                graph.addConditionalEdges(
                        nodeId,
                        edgeState -> CompletableFuture.completedFuture(
                                edgeState.valueAsString(routeKey(nodeId)).orElse(successors.getFirst())
                        ),
                        routes
                );
            }

            for (String nodeId : dag.getNodeIds()) {
                if (dag.getInDegree(nodeId) == 0) {
                    graph.addEdge(START, nodeId);
                }
            }
        } catch (GraphStateException e) {
            throw new IllegalStateException("Failed to build LangGraph4j state graph", e);
        }

        return graph;
    }

    private Map<String, Object> executeNode(
            DAGNode node,
            DAG dag,
            ExecutionContext context,
            ParallelStageExecutor.StageExecutionListener listener,
            AtomicInteger executedSteps
    ) {
        if (executedSteps.incrementAndGet() > DEFAULT_MAX_STEPS) {
            throw new NodeExecutionException(
                    node.nodeId(),
                    "LangGraph4j execution exceeded max steps " + DEFAULT_MAX_STEPS + ", possible infinite loop"
            );
        }

        if (listener != null) {
            listener.onNodeStart(node.nodeId(), node.label());
        }

        long startTime = System.currentTimeMillis();
        NodeExecutor executor = findExecutor(node.nodeType());

        try {
            String rawResult = executor.execute(node, context, dag);
            RoutingDecision routingDecision = determineRoute(node, dag, context, rawResult);
            String result = routingDecision.cleanedOutput();

            context.put(node.nodeId(), result);
            if ("OUTPUT".equals(node.nodeType())) {
                context.put("finalOutput", result);
            }

            long duration = System.currentTimeMillis() - startTime;
            if (listener != null) {
                listener.onNodeComplete(node.nodeId(), node.label(), result, duration);
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put(outputKey(node.nodeId()), result);
            updates.put(routeKey(node.nodeId()), routingDecision.nextNodeId());
            updates.put("lastNodeId", node.nodeId());
            updates.put("lastOutput", result);
            if ("OUTPUT".equals(node.nodeType())) {
                updates.put("finalOutput", result);
            }
            return updates;
        } catch (Exception e) {
            if (listener != null) {
                listener.onNodeError(node.nodeId(), node.label(), e.getMessage());
            }
            throw e;
        }
    }

    private NodeExecutor findExecutor(String nodeType) {
        return nodeExecutors.stream()
                .filter(executor -> executor.supports(nodeType))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No executor found for node type: " + nodeType));
    }

    private RoutingDecision determineRoute(DAGNode node, DAG dag, ExecutionContext context, String rawResult) {
        List<String> successors = dag.getSuccessors(node.nodeId());
        if (successors.isEmpty()) {
            return new RoutingDecision(rawResult, END);
        }

        if (successors.size() == 1) {
            return new RoutingDecision(rawResult, successors.getFirst());
        }

        String cleanedOutput = rawResult == null ? "" : rawResult;
        String selectedNode = resolveRouteFromContext(node, successors, context);
        if (selectedNode == null) {
            selectedNode = resolveRouteFromConfig(node, cleanedOutput, successors);
        }
        if (selectedNode == null) {
            selectedNode = extractNextNodeId(cleanedOutput, successors);
        }
        if (selectedNode == null) {
            selectedNode = extractNextNodeLabel(cleanedOutput, dag, successors);
        }
        if (selectedNode == null) {
            selectedNode = successors.getFirst();
        }

        cleanedOutput = stripRoutingDirectives(cleanedOutput);
        return new RoutingDecision(cleanedOutput, selectedNode);
    }

    private String resolveRouteFromContext(DAGNode node, List<String> allowedSuccessors, ExecutionContext context) {
        String nextNodeId = context.getRoute(node.nodeId());
        if (nextNodeId != null && allowedSuccessors.contains(nextNodeId)) {
            return nextNodeId;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String resolveRouteFromConfig(DAGNode node, String output, List<String> allowedSuccessors) {
        Object routingObj = node.config().get("langGraphRouting");
        if (!(routingObj instanceof Map<?, ?> routingMap)) {
            return null;
        }

        Object rulesObj = routingMap.get("rules");
        if (rulesObj instanceof List<?> rules) {
            for (Object ruleObj : rules) {
                if (!(ruleObj instanceof Map<?, ?> ruleMap)) {
                    continue;
                }
                String nextNodeId = asString(ruleMap.get("nextNodeId"));
                if (nextNodeId == null || !allowedSuccessors.contains(nextNodeId)) {
                    continue;
                }
                if (matchesRule(asString(ruleMap.get("matchType")), asString(ruleMap.get("matchValue")), output)) {
                    return nextNodeId;
                }
            }
        }

        String defaultNextNodeId = asString(routingMap.get("defaultNextNodeId"));
        if (defaultNextNodeId != null && allowedSuccessors.contains(defaultNextNodeId)) {
            return defaultNextNodeId;
        }
        return null;
    }

    private boolean matchesRule(String matchType, String matchValue, String output) {
        if (matchType == null || matchValue == null || matchValue.isBlank()) {
            return false;
        }

        return switch (matchType.trim().toLowerCase()) {
            case "contains" -> output.contains(matchValue);
            case "equals" -> output.trim().equals(matchValue.trim());
            case "regex" -> matchesRegex(matchValue, output);
            default -> false;
        };
    }

    private boolean matchesRegex(String regex, String output) {
        try {
            return Pattern.compile(regex, Pattern.DOTALL).matcher(output).find();
        } catch (PatternSyntaxException e) {
            log.warn("Invalid LangGraph4j route regex '{}': {}", regex, e.getMessage());
            return false;
        }
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String str = value.toString();
        return str.isBlank() ? null : str;
    }

    private String extractNextNodeId(String output, List<String> allowedSuccessors) {
        Matcher matcher = NEXT_NODE_PATTERN.matcher(output == null ? "" : output);
        if (!matcher.find()) {
            return null;
        }
        String nextNodeId = matcher.group(1).trim();
        return allowedSuccessors.contains(nextNodeId) ? nextNodeId : null;
    }

    private String extractNextNodeLabel(String output, DAG dag, List<String> allowedSuccessors) {
        Matcher matcher = NEXT_LABEL_PATTERN.matcher(output == null ? "" : output);
        if (!matcher.find()) {
            return null;
        }
        String nextLabel = matcher.group(1).trim();
        return allowedSuccessors.stream()
                .filter(nodeId -> {
                    DAGNode successor = dag.getNode(nodeId);
                    return successor != null && successor.label().equalsIgnoreCase(nextLabel);
                })
                .findFirst()
                .orElse(null);
    }

    private String stripRoutingDirectives(String output) {
        return output
                .replaceAll("(?m)^NEXT:\\s*[\\w-]+\\s*$\\n?", "")
                .replaceAll("(?m)^NEXT_LABEL:\\s*.+?$\\n?", "")
                .trim();
    }

    private String outputKey(String nodeId) {
        return "output:" + nodeId;
    }

    private String routeKey(String nodeId) {
        return "route:" + nodeId;
    }

    private record RoutingDecision(String cleanedOutput, String nextNodeId) {
    }
}
