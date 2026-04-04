package com.paiagent.engine;

import com.paiagent.engine.model.DAG;
import com.paiagent.exception.DAGCycleException;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Kahn's algorithm for topological sorting.
 * Groups nodes into stages - nodes in the same stage can be executed in parallel.
 */
@Component
public class TopologicalSorter {

    public ExecutionPlan sort(DAG dag) {
        Map<String, Integer> inDegree = new HashMap<>();
        for (String nodeId : dag.getNodeIds()) {
            inDegree.put(nodeId, dag.getInDegree(nodeId));
        }

        Queue<String> queue = new LinkedList<>();
        for (var entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.add(entry.getKey());
            }
        }

        List<List<String>> stages = new ArrayList<>();
        int processedCount = 0;

        while (!queue.isEmpty()) {
            List<String> currentStage = new ArrayList<>(queue);
            queue.clear();
            stages.add(currentStage);
            processedCount += currentStage.size();

            for (String nodeId : currentStage) {
                for (String successor : dag.getSuccessors(nodeId)) {
                    int newDegree = inDegree.get(successor) - 1;
                    inDegree.put(successor, newDegree);
                    if (newDegree == 0) {
                        queue.add(successor);
                    }
                }
            }
        }

        if (processedCount != dag.size()) {
            throw new DAGCycleException("Workflow contains a cycle, cannot execute");
        }

        return new ExecutionPlan(stages);
    }
}
