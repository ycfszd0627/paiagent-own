package com.paiagent.dto.response;

import java.util.List;
import java.util.Map;

public record NodeTypeResponse(
        String type,
        String subtype,
        String label,
        String category,
        String icon,
        Map<String, Object> defaultConfig,
        List<PortDef> inputs,
        List<PortDef> outputs
) {
    public record PortDef(String name, String label) {}
}
