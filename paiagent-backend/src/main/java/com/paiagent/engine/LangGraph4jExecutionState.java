package com.paiagent.engine;

import org.bsc.langgraph4j.state.AgentState;

import java.util.Map;
import java.util.Optional;

public class LangGraph4jExecutionState extends AgentState {

    public LangGraph4jExecutionState(Map<String, Object> initData) {
        super(initData);
    }

    public Optional<String> valueAsString(String key) {
        return value(key).map(Object::toString);
    }
}
