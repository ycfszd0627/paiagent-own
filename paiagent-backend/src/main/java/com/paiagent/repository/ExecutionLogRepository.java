package com.paiagent.repository;

import com.paiagent.entity.ExecutionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExecutionLogRepository extends JpaRepository<ExecutionLog, Long> {
    List<ExecutionLog> findByWorkflowIdOrderByStartedAtDesc(Long workflowId);
}
