package com.paiagent.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record WorkflowResponse(
        Long id,
        String name,
        String description,
        String status,
        String frameworkType,
        Map<String, Object> canvasState,
        List<NodeDTO> nodes,
        List<EdgeDTO> edges,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record NodeDTO(
            String nodeId,
            String type,
            String subtype,
            String label,
            Position position,
            Map<String, Object> config
    ) {}

    public record EdgeDTO(
            String edgeId,
            String sourceNodeId,
            String sourcePort,
            String targetNodeId,
            String targetPort
    ) {}

    public record Position(double x, double y) {}
}
