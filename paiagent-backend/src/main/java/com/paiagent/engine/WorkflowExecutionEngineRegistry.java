package com.paiagent.engine;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class WorkflowExecutionEngineRegistry {

    private final Map<String, WorkflowExecutionEngine> engines;

    public WorkflowExecutionEngineRegistry(List<WorkflowExecutionEngine> engines) {
        this.engines = engines.stream()
                .collect(Collectors.toMap(
                        engine -> WorkflowFrameworkType.normalize(engine.getFrameworkType()),
                        Function.identity()
                ));
    }

    public WorkflowExecutionEngine getEngine(String frameworkType) {
        return engines.getOrDefault(
                WorkflowFrameworkType.normalize(frameworkType),
                engines.get(WorkflowFrameworkType.DAG)
        );
    }
}
