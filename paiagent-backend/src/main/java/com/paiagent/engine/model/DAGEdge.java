package com.paiagent.engine.model;

public record DAGEdge(
        String sourceNodeId,
        String sourcePort,
        String targetNodeId,
        String targetPort
) {}
