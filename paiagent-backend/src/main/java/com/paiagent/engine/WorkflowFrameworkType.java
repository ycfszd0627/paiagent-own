package com.paiagent.engine;

public final class WorkflowFrameworkType {

    public static final String DAG = "DAG";
    public static final String LANGGRAPH4J = "LANGGRAPH4J";

    private WorkflowFrameworkType() {
    }

    public static String normalize(String frameworkType) {
        if (frameworkType == null || frameworkType.isBlank()) {
            return DAG;
        }
        return switch (frameworkType.trim().toUpperCase()) {
            case DAG -> DAG;
            case LANGGRAPH4J -> LANGGRAPH4J;
            default -> DAG;
        };
    }
}
