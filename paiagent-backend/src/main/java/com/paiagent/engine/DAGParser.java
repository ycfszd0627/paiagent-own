package com.paiagent.engine;

import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGEdge;
import com.paiagent.engine.model.DAGNode;
import com.paiagent.entity.WorkflowEdge;
import com.paiagent.entity.WorkflowNode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DAGParser {

    private final ObjectMapper objectMapper;

    public DAG parse(List<WorkflowNode> nodes, List<WorkflowEdge> edges) {
        DAG dag = new DAG();

        for (WorkflowNode node : nodes) {
            dag.addNode(new DAGNode(
                    node.getNodeId(),
                    node.getNodeType(),
                    node.getNodeSubtype(),
                    node.getLabel(),
                    parseConfig(node.getConfigJson())
            ));
        }

        for (WorkflowEdge edge : edges) {
            dag.addEdge(new DAGEdge(
                    edge.getSourceNodeId(),
                    edge.getSourcePort(),
                    edge.getTargetNodeId(),
                    edge.getTargetPort()
            ));
        }

        return dag;
    }

    private Map<String, Object> parseConfig(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
