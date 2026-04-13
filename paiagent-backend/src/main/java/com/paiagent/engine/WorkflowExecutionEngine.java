package com.paiagent.engine;

import com.paiagent.entity.Workflow;

public interface WorkflowExecutionEngine {

    String getFrameworkType();

    String execute(Workflow workflow, String userInput);

    String execute(Workflow workflow, String userInput, ParallelStageExecutor.StageExecutionListener listener);
}
