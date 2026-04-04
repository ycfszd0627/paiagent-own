package com.paiagent.exception;

public class DAGCycleException extends RuntimeException {
    public DAGCycleException(String message) {
        super(message);
    }
}
