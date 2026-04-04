package com.paiagent.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "workflow_nodes")
@Getter
@Setter
@NoArgsConstructor
public class WorkflowNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(name = "node_id", nullable = false, length = 50)
    private String nodeId;

    @Column(name = "node_type", nullable = false, length = 30)
    private String nodeType;

    @Column(name = "node_subtype", length = 50)
    private String nodeSubtype;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "position_x", nullable = false)
    private Double positionX = 0.0;

    @Column(name = "position_y", nullable = false)
    private Double positionY = 0.0;

    @Column(name = "config_json", nullable = false, columnDefinition = "JSON")
    private String configJson = "{}";
}
