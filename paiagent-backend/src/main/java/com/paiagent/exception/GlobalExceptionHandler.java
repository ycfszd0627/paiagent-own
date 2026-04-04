package com.paiagent.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(WorkflowNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(WorkflowNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "NOT_FOUND",
                "message", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(DAGCycleException.class)
    public ResponseEntity<Map<String, Object>> handleDAGCycle(DAGCycleException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "DAG_CYCLE",
                "message", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(NodeExecutionException.class)
    public ResponseEntity<Map<String, Object>> handleNodeExecution(NodeExecutionException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "NODE_EXECUTION_FAILED",
                "message", ex.getMessage(),
                "nodeId", ex.getNodeId(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "INTERNAL_ERROR",
                "message", ex.getMessage() != null ? ex.getMessage() : "Unknown error",
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
