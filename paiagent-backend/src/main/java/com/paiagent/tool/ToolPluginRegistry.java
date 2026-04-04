package com.paiagent.tool;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@Slf4j
public class ToolPluginRegistry {

    private final Map<String, ToolPlugin> pluginMap;

    public ToolPluginRegistry(List<ToolPlugin> plugins) {
        this.pluginMap = plugins.stream()
                .collect(Collectors.toMap(ToolPlugin::getToolName, Function.identity()));
        log.info("Loaded tool plugins: {}", pluginMap.keySet());
    }

    public ToolPlugin getPlugin(String toolName) {
        return pluginMap.get(toolName);
    }

    public List<ToolPlugin> getAllPlugins() {
        return List.copyOf(pluginMap.values());
    }
}
