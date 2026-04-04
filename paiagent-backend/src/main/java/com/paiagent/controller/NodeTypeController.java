package com.paiagent.controller;

import com.paiagent.dto.response.NodeTypeResponse;
import com.paiagent.service.NodeTypeRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/node-types")
@RequiredArgsConstructor
public class NodeTypeController {

    private final NodeTypeRegistryService nodeTypeRegistryService;

    @GetMapping
    public List<NodeTypeResponse> getNodeTypes() {
        return nodeTypeRegistryService.getAvailableNodeTypes();
    }
}
