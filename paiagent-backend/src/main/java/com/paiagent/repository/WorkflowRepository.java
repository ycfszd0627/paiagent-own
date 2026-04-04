package com.paiagent.repository;

import com.paiagent.entity.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
}
