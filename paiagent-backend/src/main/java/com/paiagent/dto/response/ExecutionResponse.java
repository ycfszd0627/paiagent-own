package com.paiagent.dto.response;

import java.time.LocalDateTime;

public record ExecutionResponse(
        Long id,
        Long workflowId,
        String status,
        String inputData,
        String outputData,
        String stepDetails,
        String errorMessage,
        Long durationMs,
        LocalDateTime startedAt,
        LocalDateTime finishedAt
) {}
