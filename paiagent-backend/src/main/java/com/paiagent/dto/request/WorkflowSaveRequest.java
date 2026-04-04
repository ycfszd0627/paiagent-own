package com.paiagent.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

public record WorkflowSaveRequest(
        @NotBlank String name,
        String description,
        Map<String, Object> canvasState,
        List<NodeDTO> nodes,
        List<EdgeDTO> edges
) {
    public record NodeDTO(
            @NotBlank String nodeId,
            @NotBlank String type,
            String subtype,
            @NotBlank String label,
            Position position,
            Map<String, Object> config
    ) {}

    public record EdgeDTO(
            @NotBlank String edgeId,
            @NotBlank String sourceNodeId,
            String sourcePort,
            @NotBlank String targetNodeId,
            String targetPort
    ) {}

    public record Position(double x, double y) {}
}
