package com.paiagent.service;

import com.paiagent.dto.response.NodeTypeResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class NodeTypeRegistryService {

    public List<NodeTypeResponse> getAvailableNodeTypes() {
        return List.of(
                new NodeTypeResponse(
                        "INPUT", null, "输入", "基础节点", "login",
                        Map.of(),
                        List.of(),
                        List.of(new NodeTypeResponse.PortDef("default", "输出"))
                ),
                new NodeTypeResponse(
                        "OUTPUT", null, "输出", "基础节点", "export",
                        Map.of(),
                        List.of(new NodeTypeResponse.PortDef("default", "输入")),
                        List.of()
                ),
                new NodeTypeResponse(
                        "LLM", "deepseek", "DeepSeek", "大模型节点", "robot",
                        Map.of("model", "deepseek-chat", "temperature", 0.7, "maxTokens", 2048, "systemPrompt", ""),
                        List.of(new NodeTypeResponse.PortDef("default", "输入")),
                        List.of(new NodeTypeResponse.PortDef("default", "输出"))
                ),
                new NodeTypeResponse(
                        "LLM", "tongyi", "通义千问", "大模型节点", "cloud",
                        Map.of("model", "qwen-max", "temperature", 0.7, "maxTokens", 2048, "systemPrompt", ""),
                        List.of(new NodeTypeResponse.PortDef("default", "输入")),
                        List.of(new NodeTypeResponse.PortDef("default", "输出"))
                ),
                new NodeTypeResponse(
                        "LLM", "openai", "OpenAI", "大模型节点", "openai",
                        Map.of("model", "gpt-4o-mini", "temperature", 0.7, "maxTokens", 2048, "systemPrompt", ""),
                        List.of(new NodeTypeResponse.PortDef("default", "输入")),
                        List.of(new NodeTypeResponse.PortDef("default", "输出"))
                ),
                new NodeTypeResponse(
                        "TOOL", "tts", "超拟人音频合成", "工具节点", "sound",
                        Map.of("voice", "default", "speed", 1.0),
                        List.of(new NodeTypeResponse.PortDef("default", "输入")),
                        List.of(new NodeTypeResponse.PortDef("default", "输出"))
                )
        );
    }
}
