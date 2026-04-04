package com.paiagent.exception;

public class NodeExecutionException extends RuntimeException {
    private final String nodeId;

    public NodeExecutionException(String nodeId, String message) {
        super("Node [" + nodeId + "] execution failed: " + message);
        this.nodeId = nodeId;
    }

    public NodeExecutionException(String nodeId, String message, Throwable cause) {
        super("Node [" + nodeId + "] execution failed: " + message, cause);
        this.nodeId = nodeId;
    }

    public String getNodeId() {
        return nodeId;
    }
}
