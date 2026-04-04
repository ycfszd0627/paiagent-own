package com.paiagent.engine;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe execution context for passing data between nodes.
 */
public class ExecutionContext {

    private final ConcurrentHashMap<String, Object> data = new ConcurrentHashMap<>();
    private String userInput;

    public ExecutionContext(String userInput) {
        this.userInput = userInput;
    }

    public String getUserInput() {
        return userInput;
    }

    public void put(String nodeId, Object value) {
        data.put(nodeId, value);
    }

    public Object get(String nodeId) {
        return data.get(nodeId);
    }

    public String getAsString(String nodeId) {
        Object val = data.get(nodeId);
        return val != null ? val.toString() : "";
    }

    public Map<String, Object> getAllData() {
        return Map.copyOf(data);
    }
}
