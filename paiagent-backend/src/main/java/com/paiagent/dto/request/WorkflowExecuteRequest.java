package com.paiagent.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WorkflowExecuteRequest(
        @NotBlank String input
) {}
