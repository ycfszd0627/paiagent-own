package com.paiagent.controller;

import com.paiagent.dto.request.WorkflowSaveRequest;
import com.paiagent.dto.response.WorkflowResponse;
import com.paiagent.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @GetMapping
    public List<WorkflowResponse> listWorkflows() {
        return workflowService.listWorkflows();
    }

    @GetMapping("/{id}")
    public WorkflowResponse getWorkflow(@PathVariable Long id) {
        return workflowService.getWorkflow(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkflowResponse createWorkflow(@Valid @RequestBody WorkflowSaveRequest request) {
        return workflowService.createWorkflow(request);
    }

    @PutMapping("/{id}")
    public WorkflowResponse updateWorkflow(@PathVariable Long id, @Valid @RequestBody WorkflowSaveRequest request) {
        return workflowService.updateWorkflow(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWorkflow(@PathVariable Long id) {
        workflowService.deleteWorkflow(id);
    }
}
