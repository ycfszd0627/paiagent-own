package com.paiagent.engine.model;

import java.util.*;

public class DAG {

    private final Map<String, DAGNode> nodes = new LinkedHashMap<>();
    private final List<DAGEdge> edges = new ArrayList<>();
    private final Map<String, List<String>> adjacency = new HashMap<>();
    private final Map<String, List<String>> reverseAdjacency = new HashMap<>();

    public void addNode(DAGNode node) {
        nodes.put(node.nodeId(), node);
        adjacency.putIfAbsent(node.nodeId(), new ArrayList<>());
        reverseAdjacency.putIfAbsent(node.nodeId(), new ArrayList<>());
    }

    public void addEdge(DAGEdge edge) {
        edges.add(edge);
        adjacency.computeIfAbsent(edge.sourceNodeId(), k -> new ArrayList<>()).add(edge.targetNodeId());
        reverseAdjacency.computeIfAbsent(edge.targetNodeId(), k -> new ArrayList<>()).add(edge.sourceNodeId());
    }

    public DAGNode getNode(String nodeId) {
        return nodes.get(nodeId);
    }

    public Collection<DAGNode> getAllNodes() {
        return nodes.values();
    }

    public List<DAGEdge> getAllEdges() {
        return Collections.unmodifiableList(edges);
    }

    public List<String> getSuccessors(String nodeId) {
        return adjacency.getOrDefault(nodeId, List.of());
    }

    public List<String> getPredecessors(String nodeId) {
        return reverseAdjacency.getOrDefault(nodeId, List.of());
    }

    public int getInDegree(String nodeId) {
        return reverseAdjacency.getOrDefault(nodeId, List.of()).size();
    }

    public int size() {
        return nodes.size();
    }

    public Set<String> getNodeIds() {
        return nodes.keySet();
    }
}
