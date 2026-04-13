package com.paiagent.service;

import com.paiagent.dto.request.WorkflowExecuteRequest;
import com.paiagent.dto.response.ExecutionResponse;
import com.paiagent.engine.ParallelStageExecutor;
import com.paiagent.engine.WorkflowExecutionEngine;
import com.paiagent.engine.WorkflowExecutionEngineRegistry;
import com.paiagent.entity.ExecutionLog;
import com.paiagent.entity.Workflow;
import com.paiagent.exception.WorkflowNotFoundException;
import com.paiagent.repository.ExecutionLogRepository;
import com.paiagent.repository.WorkflowRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionService {

    private final WorkflowExecutionEngineRegistry workflowExecutionEngineRegistry;
    private final WorkflowRepository workflowRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    protected Workflow loadWorkflowForExecution(Long workflowId) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new WorkflowNotFoundException(workflowId));
        Hibernate.initialize(workflow.getNodes());
        Hibernate.initialize(workflow.getEdges());
        return workflow;
    }

    public ExecutionResponse executeSync(Long workflowId, WorkflowExecuteRequest request) {
        Workflow workflow = loadWorkflowForExecution(workflowId);
        WorkflowExecutionEngine workflowEngine = workflowExecutionEngineRegistry.getEngine(workflow.getFrameworkType());

        ExecutionLog execLog = new ExecutionLog();
        execLog.setWorkflow(workflow);
        execLog.setStatus("RUNNING");
        execLog.setInputData(request.input());
        execLog = executionLogRepository.save(execLog);

        long startTime = System.currentTimeMillis();
        try {
            String output = workflowEngine.execute(workflow, request.input());
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
        SseEmitter emitter = new SseEmitter(360_000L); // 6 min timeout
        AtomicBoolean emitterClosed = new AtomicBoolean(false);

        emitter.onCompletion(() -> emitterClosed.set(true));
        emitter.onTimeout(() -> {
            emitterClosed.set(true);
            log.warn("SSE emitter timed out for workflow [{}]", workflowId);
        });
        emitter.onError(ex -> {
            emitterClosed.set(true);
            log.warn("SSE emitter error for workflow [{}]: {}", workflowId, ex.getMessage());
        });

        Workflow workflow = loadWorkflowForExecution(workflowId);
        WorkflowExecutionEngine workflowEngine = workflowExecutionEngineRegistry.getEngine(workflow.getFrameworkType());

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
                    sendEvent(emitter, emitterClosed, "node-start", Map.of(
                            "nodeId", nodeId, "label", label, "status", "RUNNING"
                    ));
                }

                @Override
                public void onNodeComplete(String nodeId, String label, String output, long durationMs) {
                    steps.add(Map.of("nodeId", nodeId, "label", label, "status", "SUCCESS", "durationMs", durationMs));
                    sendEvent(emitter, emitterClosed, "node-complete", Map.of(
                            "nodeId", nodeId, "label", label, "output", output,
                            "durationMs", durationMs, "status", "SUCCESS"
                    ));
                }

                @Override
                public void onNodeError(String nodeId, String label, String error) {
                    steps.add(Map.of("nodeId", nodeId, "label", label, "status", "FAILED", "error", error));
                    sendEvent(emitter, emitterClosed, "node-error", Map.of(
                            "nodeId", nodeId, "label", label, "error", error, "status", "FAILED"
                    ));
                }
            };

            try {
                String output = workflowEngine.execute(workflow, request.input(), listener);
                long duration = System.currentTimeMillis() - startTime;

                savedLog.setStatus("SUCCESS");
                savedLog.setOutputData(output);
                savedLog.setStepDetails(toJson(steps));
                savedLog.setDurationMs(duration);
                savedLog.setFinishedAt(LocalDateTime.now());
                executionLogRepository.save(savedLog);

                sendEvent(emitter, emitterClosed, "workflow-complete", Map.of(
                        "finalOutput", output, "durationMs", duration, "status", "SUCCESS"
                ));
                if (emitterClosed.compareAndSet(false, true)) {
                    emitter.complete();
                }
            } catch (Exception e) {
                long duration = System.currentTimeMillis() - startTime;
                savedLog.setStatus("FAILED");
                savedLog.setErrorMessage(e.getMessage());
                savedLog.setStepDetails(toJson(steps));
                savedLog.setDurationMs(duration);
                savedLog.setFinishedAt(LocalDateTime.now());
                executionLogRepository.save(savedLog);

                sendEvent(emitter, emitterClosed, "workflow-error", Map.of(
                        "error", e.getMessage() != null ? e.getMessage() : "Unknown error",
                        "status", "FAILED"
                ));
                if (emitterClosed.compareAndSet(false, true)) {
                    emitter.complete();
                }
            }
        });

        return emitter;
    }

    public List<ExecutionResponse> getExecutionHistory(Long workflowId) {
        return executionLogRepository.findByWorkflowIdOrderByStartedAtDesc(workflowId).stream()
                .map(this::toResponse)
                .toList();
    }

    private void sendEvent(SseEmitter emitter, AtomicBoolean emitterClosed, String eventName, Map<String, Object> data) {
        if (emitterClosed.get()) {
            return;
        }
        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(toJson(data)));
        } catch (IOException | IllegalStateException e) {
            emitterClosed.set(true);
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
}
