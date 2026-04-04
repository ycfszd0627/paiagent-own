package com.paiagent.controller;

import com.paiagent.dto.request.WorkflowExecuteRequest;
import com.paiagent.dto.response.ExecutionResponse;
import com.paiagent.service.ExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workflows/{workflowId}")
@RequiredArgsConstructor
public class ExecutionController {

    private final ExecutionService executionService;

    @PostMapping("/execute")
    public ExecutionResponse execute(@PathVariable Long workflowId,
                                     @Valid @RequestBody WorkflowExecuteRequest request) {
        return executionService.executeSync(workflowId, request);
    }

    @PostMapping(value = "/execute/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter executeStream(@PathVariable Long workflowId,
                                    @Valid @RequestBody WorkflowExecuteRequest request) {
        return executionService.executeStream(workflowId, request);
    }

    @GetMapping("/executions")
    public List<ExecutionResponse> getExecutionHistory(@PathVariable Long workflowId) {
        return executionService.getExecutionHistory(workflowId);
    }
}
