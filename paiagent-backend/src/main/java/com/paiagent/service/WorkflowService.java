package com.paiagent.service;

import com.paiagent.dto.request.WorkflowSaveRequest;
import com.paiagent.dto.response.WorkflowResponse;
import com.paiagent.engine.WorkflowFrameworkType;
import com.paiagent.entity.Workflow;
import com.paiagent.entity.WorkflowEdge;
import com.paiagent.entity.WorkflowNode;
import com.paiagent.exception.WorkflowNotFoundException;
import com.paiagent.repository.WorkflowRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final ObjectMapper objectMapper;

    public List<WorkflowResponse> listWorkflows() {
        return workflowRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public WorkflowResponse getWorkflow(Long id) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new WorkflowNotFoundException(id));
        return toResponse(workflow);
    }

    @Transactional
    public WorkflowResponse createWorkflow(WorkflowSaveRequest request) {
        Workflow workflow = new Workflow();
        applyRequest(workflow, request);
        workflow = workflowRepository.save(workflow);
        return toResponse(workflow);
    }

    @Transactional
    public WorkflowResponse updateWorkflow(Long id, WorkflowSaveRequest request) {
        Workflow workflow = workflowRepository.findById(id)
                .orElseThrow(() -> new WorkflowNotFoundException(id));
        workflow.getNodes().clear();
        workflow.getEdges().clear();
        applyRequest(workflow, request);
        workflow = workflowRepository.save(workflow);
        return toResponse(workflow);
    }

    @Transactional
    public void deleteWorkflow(Long id) {
        if (!workflowRepository.existsById(id)) {
            throw new WorkflowNotFoundException(id);
        }
        workflowRepository.deleteById(id);
    }

    private void applyRequest(Workflow workflow, WorkflowSaveRequest request) {
        workflow.setName(request.name());
        workflow.setDescription(request.description());
        workflow.setFrameworkType(WorkflowFrameworkType.normalize(request.frameworkType()));
        workflow.setCanvasJson(toJson(request.canvasState()));

        if (request.nodes() != null) {
            for (var nodeDto : request.nodes()) {
                WorkflowNode node = new WorkflowNode();
                node.setWorkflow(workflow);
                node.setNodeId(nodeDto.nodeId());
                node.setNodeType(nodeDto.type());
                node.setNodeSubtype(nodeDto.subtype());
                node.setLabel(nodeDto.label());
                if (nodeDto.position() != null) {
                    node.setPositionX(nodeDto.position().x());
                    node.setPositionY(nodeDto.position().y());
                }
                node.setConfigJson(toJson(nodeDto.config() != null ? nodeDto.config() : Map.of()));
                workflow.getNodes().add(node);
            }
        }

        if (request.edges() != null) {
            for (var edgeDto : request.edges()) {
                WorkflowEdge edge = new WorkflowEdge();
                edge.setWorkflow(workflow);
                edge.setEdgeId(edgeDto.edgeId());
                edge.setSourceNodeId(edgeDto.sourceNodeId());
                edge.setSourcePort(edgeDto.sourcePort() != null ? edgeDto.sourcePort() : "default");
                edge.setTargetNodeId(edgeDto.targetNodeId());
                edge.setTargetPort(edgeDto.targetPort() != null ? edgeDto.targetPort() : "default");
                workflow.getEdges().add(edge);
            }
        }
    }

    private WorkflowResponse toResponse(Workflow workflow) {
        List<WorkflowResponse.NodeDTO> nodes = workflow.getNodes().stream()
                .map(n -> new WorkflowResponse.NodeDTO(
                        n.getNodeId(),
                        n.getNodeType(),
                        n.getNodeSubtype(),
                        n.getLabel(),
                        new WorkflowResponse.Position(n.getPositionX(), n.getPositionY()),
                        parseJson(n.getConfigJson())
                ))
                .toList();

        List<WorkflowResponse.EdgeDTO> edges = workflow.getEdges().stream()
                .map(e -> new WorkflowResponse.EdgeDTO(
                        e.getEdgeId(),
                        e.getSourceNodeId(),
                        e.getSourcePort(),
                        e.getTargetNodeId(),
                        e.getTargetPort()
                ))
                .toList();

        return new WorkflowResponse(
                workflow.getId(),
                workflow.getName(),
                workflow.getDescription(),
                workflow.getStatus(),
                WorkflowFrameworkType.normalize(workflow.getFrameworkType()),
                parseJson(workflow.getCanvasJson()),
                nodes,
                edges,
                workflow.getCreatedAt(),
                workflow.getUpdatedAt()
        );
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
