package com.paiagent.repository;

import com.paiagent.entity.WorkflowEdge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkflowEdgeRepository extends JpaRepository<WorkflowEdge, Long> {
    List<WorkflowEdge> findByWorkflowId(Long workflowId);
    void deleteByWorkflowId(Long workflowId);
}
