package com.paiagent.tool;

import java.util.Map;

public interface ToolPlugin {

    String execute(String input, Map<String, Object> config);

    String getToolName();

    String getDisplayName();
}
