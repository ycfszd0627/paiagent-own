package com.paiagent.engine.executor;

import com.paiagent.engine.ExecutionContext;
import com.paiagent.engine.NodeExecutor;
import com.paiagent.engine.model.DAG;
import com.paiagent.engine.model.DAGNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Component
public class ConditionNodeExecutor implements NodeExecutor {

    @Override
    public String execute(DAGNode node, ExecutionContext context, DAG dag) {
        int loopCount = context.incrementNodeExecutionCount(node.nodeId());
        context.putGlobal("loopCount", loopCount);
        context.putGlobal("currentConditionNodeId", node.nodeId());
        context.putGlobal("currentConditionNodeLabel", node.label());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rules = node.config().get("conditionRules") instanceof List<?> list
                ? (List<Map<String, Object>>) list
                : List.of();

        String matchedRuleId = null;
        String matchedNextNodeId = null;
        String matchedSummary = null;
        String matchedOutputVariablePath = null;

        for (Map<String, Object> rule : rules) {
            String variablePath = asString(rule.get("variablePath"));
            String operator = asString(rule.get("operator"));
            String compareValue = asString(rule.get("compareValue"));
            String nextNodeId = asString(rule.get("nextNodeId"));
            Object actualValue = context.resolveReference(variablePath);

            if (matches(actualValue, operator, compareValue)) {
                matchedRuleId = asString(rule.get("id"));
                matchedNextNodeId = nextNodeId;
                matchedOutputVariablePath = asString(rule.get("outputVariablePath"));
                matchedSummary = "命中规则 " + (matchedRuleId != null ? matchedRuleId : "") +
                        ": " + variablePath + " " + operator + " " + compareValue;
                break;
            }
        }

        String defaultNextNodeId = asString(node.config().get("defaultNextNodeId"));
        String defaultOutputVariablePath = asString(node.config().get("defaultOutputVariablePath"));
        String selectedNextNodeId = matchedNextNodeId != null ? matchedNextNodeId : defaultNextNodeId;
        String selectedOutputVariablePath = matchedOutputVariablePath != null ? matchedOutputVariablePath : defaultOutputVariablePath;
        if (selectedNextNodeId != null) {
            context.setRoute(node.nodeId(), selectedNextNodeId);
        }

        context.putGlobal("conditionMatchedRuleId", matchedRuleId);
        context.putGlobal("conditionNextNodeId", selectedNextNodeId);
        context.putGlobal("conditionMatched", matchedNextNodeId != null);
        context.putGlobal("conditionOutputVariablePath", selectedOutputVariablePath);

        String outputValue = resolveOutputValue(context, selectedOutputVariablePath);
        String result = outputValue != null
                ? outputValue
                : (matchedSummary != null
                    ? matchedSummary + " -> " + selectedNextNodeId
                    : "未命中条件规则，使用默认分支 -> " + (selectedNextNodeId != null ? selectedNextNodeId : "未配置"));

        context.put(node.nodeId(), result);
        return result;
    }

    @Override
    public boolean supports(String nodeType) {
        return "CONDITION".equals(nodeType);
    }

    private boolean matches(Object actualValue, String operator, String compareValue) {
        if (operator == null || operator.isBlank()) {
            return false;
        }

        return switch (operator) {
            case "exists" -> actualValue != null;
            case "not_exists" -> actualValue == null;
            case "equals" -> normalize(actualValue).equals(normalize(compareValue));
            case "not_equals" -> !normalize(actualValue).equals(normalize(compareValue));
            case "contains" -> normalize(actualValue).contains(normalize(compareValue));
            case "regex" -> matchesRegex(normalize(actualValue), compareValue);
            case "less_than" -> compareNumbers(actualValue, compareValue, result -> result < 0);
            case "less_or_equal" -> compareNumbers(actualValue, compareValue, result -> result <= 0);
            case "greater_than" -> compareNumbers(actualValue, compareValue, result -> result > 0);
            case "greater_or_equal" -> compareNumbers(actualValue, compareValue, result -> result >= 0);
            default -> false;
        };
    }

    private boolean matchesRegex(String actualValue, String regex) {
        try {
            return Pattern.compile(regex == null ? "" : regex, Pattern.DOTALL)
                    .matcher(actualValue)
                    .find();
        } catch (PatternSyntaxException e) {
            return false;
        }
    }

    private boolean compareNumbers(Object actualValue, String compareValue, java.util.function.IntPredicate predicate) {
        BigDecimal left = toDecimal(actualValue);
        BigDecimal right = toDecimal(compareValue);
        if (left == null || right == null) {
            return false;
        }
        return predicate.test(left.compareTo(right));
    }

    private BigDecimal toDecimal(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String normalize(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String str = value.toString().trim();
        return str.isEmpty() ? null : str;
    }

    private String resolveOutputValue(ExecutionContext context, String variablePath) {
        if (variablePath == null || variablePath.isBlank()) {
            return null;
        }
        Object value = context.resolveReference(variablePath);
        return value != null ? value.toString() : null;
    }
}
