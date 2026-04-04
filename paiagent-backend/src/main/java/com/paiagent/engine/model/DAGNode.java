package com.paiagent.engine.model;

import java.util.Map;

public record DAGNode(
        String nodeId,
        String nodeType,
        String nodeSubtype,
        String label,
        Map<String, Object> config
) {}
