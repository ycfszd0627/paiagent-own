package com.paiagent.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflows")
@Getter
@Setter
@NoArgsConstructor
public class Workflow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "framework_type", nullable = false, length = 30)
    private String frameworkType = "DAG";

    @Column(name = "canvas_json", columnDefinition = "JSON")
    private String canvasJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkflowNode> nodes = new ArrayList<>();

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkflowEdge> edges = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
