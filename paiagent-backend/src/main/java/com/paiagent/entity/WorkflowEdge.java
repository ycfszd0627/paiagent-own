package com.paiagent.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "workflow_edges")
@Getter
@Setter
@NoArgsConstructor
public class WorkflowEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(name = "edge_id", nullable = false, length = 50)
    private String edgeId;

    @Column(name = "source_node_id", nullable = false, length = 50)
    private String sourceNodeId;

    @Column(name = "source_port", nullable = false, length = 50)
    private String sourcePort = "default";

    @Column(name = "target_node_id", nullable = false, length = 50)
    private String targetNodeId;

    @Column(name = "target_port", nullable = false, length = 50)
    private String targetPort = "default";
}
