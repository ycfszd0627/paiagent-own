package com.paiagent.service;

import com.paiagent.dto.request.WorkflowExecuteRequest;
import com.paiagent.dto.response.ExecutionResponse;
import com.paiagent.engine.ParallelStageExecutor;
import com.paiagent.engine.WorkflowEngine;
import com.paiagent.entity.ExecutionLog;
import com.paiagent.entity.Workflow;
import com.paiagent.exception.WorkflowNotFoundException;
import com.paiagent.repository.ExecutionLogRepository;
import com.paiagent.repository.WorkflowRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionService {

    private final WorkflowEngine workflowEngine;
    private final WorkflowRepository workflowRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ObjectMapper objectMapper;

    public ExecutionResponse executeSync(Long workflowId, WorkflowExecuteRequest request) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new WorkflowNotFoundException(workflowId));

        ExecutionLog execLog = new ExecutionLog();
        execLog.setWorkflow(workflow);
        execLog.setStatus("RUNNING");
        execLog.setInputData(request.input());
        execLog = executionLogRepository.save(execLog);

        long startTime = System.currentTimeMillis();
        try {
            String output = workflowEngine.execute(workflowId, request.input());
            execLog.setStatus("SUCCESS");
            execLog.setOutputData(output);
            execLog.setDurationMs(System.currentTimeMillis() - startTime);
            execLog.setFinishedAt(LocalDateTime.now());
            executionLogRepository.save(execLog);

            return toResponse(execLog);
        } catch (Exception e) {
            execLog.setStatus("FAILED");
            execLog.setErrorMessage(e.getMessage());
            execLog.setDurationMs(System.currentTimeMillis() - startTime);
            execLog.setFinishedAt(LocalDateTime.now());
            executionLogRepository.save(execLog);
            throw e;
        }
    }

    public SseEmitter executeStream(Long workflowId, WorkflowExecuteRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 min timeout

        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new WorkflowNotFoundException(workflowId));

        ExecutionLog execLog = new ExecutionLog();
        execLog.setWorkflow(workflow);
        execLog.setStatus("RUNNING");
        execLog.setInputData(request.input());
        ExecutionLog savedLog = executionLogRepository.save(execLog);

        Thread.startVirtualThread(() -> {
            long startTime = System.currentTimeMillis();
            List<Map<String, Object>> steps = new ArrayList<>();

            ParallelStageExecutor.StageExecutionListener listener = new ParallelStageExecutor.StageExecutionListener() {
                @Override
                public void onNodeStart(String nodeId, String label) {
                    sendEvent(emitter, "node-start", Map.of(
                            "nodeId", nodeId, "label", label, "status", "RUNNING"
                    ));
                }

                @Override
                public void onNodeComplete(String nodeId, String label, String output, long durationMs) {
                    steps.add(Map.of("nodeId", nodeId, "label", label, "status", "SUCCESS", "durationMs", durationMs));
                    sendEvent(emitter, "node-complete", Map.of(
                            "nodeId", nodeId, "label", label, "output", truncate(output, 500),
                            "durationMs", durationMs, "status", "SUCCESS"
                    ));
                }

                @Override
                public void onNodeError(String nodeId, String label, String error) {
                    steps.add(Map.of("nodeId", nodeId, "label", label, "status", "FAILED", "error", error));
                    sendEvent(emitter, "node-error", Map.of(
                            "nodeId", nodeId, "label", label, "error", error, "status", "FAILED"
                    ));
                }
            };

            try {
                String output = workflowEngine.execute(workflowId, request.input(), listener);
                long duration = System.currentTimeMillis() - startTime;

                savedLog.setStatus("SUCCESS");
                savedLog.setOutputData(output);
                savedLog.setStepDetails(toJson(steps));
                savedLog.setDurationMs(duration);
                savedLog.setFinishedAt(LocalDateTime.now());
                executionLogRepository.save(savedLog);

                sendEvent(emitter, "workflow-complete", Map.of(
                        "finalOutput", output, "durationMs", duration, "status", "SUCCESS"
                ));
                emitter.complete();
            } catch (Exception e) {
                long duration = System.currentTimeMillis() - startTime;
                savedLog.setStatus("FAILED");
                savedLog.setErrorMessage(e.getMessage());
                savedLog.setStepDetails(toJson(steps));
                savedLog.setDurationMs(duration);
                savedLog.setFinishedAt(LocalDateTime.now());
                executionLogRepository.save(savedLog);

                sendEvent(emitter, "workflow-error", Map.of(
                        "error", e.getMessage() != null ? e.getMessage() : "Unknown error",
                        "status", "FAILED"
                ));
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    public List<ExecutionResponse> getExecutionHistory(Long workflowId) {
        return executionLogRepository.findByWorkflowIdOrderByStartedAtDesc(workflowId).stream()
                .map(this::toResponse)
                .toList();
    }

    private void sendEvent(SseEmitter emitter, String eventName, Map<String, Object> data) {
        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(toJson(data)));
        } catch (IOException e) {
            log.warn("Failed to send SSE event '{}': {}", eventName, e.getMessage());
        }
    }

    private ExecutionResponse toResponse(ExecutionLog execLog) {
        return new ExecutionResponse(
                execLog.getId(),
                execLog.getWorkflow().getId(),
                execLog.getStatus(),
                execLog.getInputData(),
                execLog.getOutputData(),
                execLog.getStepDetails(),
                execLog.getErrorMessage(),
                execLog.getDurationMs(),
                execLog.getStartedAt(),
                execLog.getFinishedAt()
        );
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        if (text.length() <= maxLen) return text;
        return text.substring(0, maxLen) + "...";
    }
}
