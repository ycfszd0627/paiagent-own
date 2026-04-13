package com.paiagent.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe execution context for passing data between nodes.
 */
public class ExecutionContext {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ConcurrentHashMap<String, Object> data = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Object> globals = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> routes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> nodeExecutionCounts = new ConcurrentHashMap<>();
    private String userInput;

    public ExecutionContext(String userInput) {
        this.userInput = userInput;
        globals.put("userInput", userInput);
    }

    public String getUserInput() {
        return userInput;
    }

    public void put(String nodeId, Object value) {
        data.put(nodeId, value);
        globals.put("lastNodeId", nodeId);
        if (value != null) {
            globals.put("lastOutput", value);
            mergeJsonGlobals(value);
        }
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

    public int incrementNodeExecutionCount(String nodeId) {
        return nodeExecutionCounts.merge(nodeId, 1, Integer::sum);
    }

    public int getNodeExecutionCount(String nodeId) {
        return nodeExecutionCounts.getOrDefault(nodeId, 0);
    }

    public void putGlobal(String key, Object value) {
        if (key == null || key.isBlank()) {
            return;
        }
        if (value == null) {
            globals.remove(key);
            return;
        }
        globals.put(key, value);
    }

    public Object getGlobal(String key) {
        return globals.get(key);
    }

    public Map<String, Object> getGlobals() {
        return Map.copyOf(globals);
    }

    public void setRoute(String nodeId, String nextNodeId) {
        if (nodeId == null || nodeId.isBlank()) {
            return;
        }
        if (nextNodeId == null || nextNodeId.isBlank()) {
            routes.remove(nodeId);
            return;
        }
        routes.put(nodeId, nextNodeId);
    }

    public String getRoute(String nodeId) {
        return routes.get(nodeId);
    }

    public Object resolveReference(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }

        if ("system.userInput".equals(path)) {
            return userInput;
        }
        if ("lastOutput".equals(path) || "globals.lastOutput".equals(path)) {
            return globals.get("lastOutput");
        }
        if ("lastNodeId".equals(path) || "globals.lastNodeId".equals(path)) {
            return globals.get("lastNodeId");
        }
        if ("loopCount".equals(path) || "globals.loopCount".equals(path)) {
            return globals.get("loopCount");
        }

        if (path.startsWith("globals.")) {
            return resolveNested(globals, path.substring("globals.".length()));
        }
        if (path.startsWith("node.")) {
            return resolveNodeReference(path.substring("node.".length()));
        }

        Object directGlobal = globals.get(path);
        if (directGlobal != null) {
            return directGlobal;
        }
        return data.get(path);
    }

    private Object resolveNodeReference(String nodePath) {
        int firstDot = nodePath.indexOf('.');
        if (firstDot < 0) {
            return data.get(nodePath);
        }

        String nodeId = nodePath.substring(0, firstDot);
        String remainder = nodePath.substring(firstDot + 1);
        Object nodeValue = data.get(nodeId);

        if ("output".equals(remainder)) {
            return nodeValue;
        }
        if (remainder.startsWith("json.")) {
            return resolveNested(asMap(nodeValue), remainder.substring("json.".length()));
        }
        return null;
    }

    private Object resolveNested(Map<String, ?> source, String path) {
        if (source == null || path == null || path.isBlank()) {
            return null;
        }

        Object current = source;
        for (String key : path.split("\\.")) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = map.get(key);
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        if (value instanceof String text) {
            try {
                return OBJECT_MAPPER.readValue(text, new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private void mergeJsonGlobals(Object value) {
        Map<String, Object> map = asMap(value);
        if (map == null || map.isEmpty()) {
            return;
        }
        map.forEach((key, val) -> {
            if (key != null && !key.isBlank() && val != null) {
                globals.put(key, val);
            }
        });
    }
}
