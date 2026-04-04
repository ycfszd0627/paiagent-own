package com.paiagent.tool.plugins;

import com.paiagent.tool.ToolPlugin;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Mock TTS (Text-to-Speech) tool plugin.
 * Returns a mock audio URL. Replace with real TTS API integration later.
 */
@Component
@Slf4j
public class TTSToolPlugin implements ToolPlugin {

    @Override
    public String execute(String input, Map<String, Object> config) {
        log.info("TTS Plugin: synthesizing audio for text (length={})", input.length());

        // Mock implementation - returns a JSON with audio info
        String audioId = "audio_" + System.currentTimeMillis();
        return """
                {"type":"audio","audioId":"%s","text":"%s","status":"generated","message":"[Mock] Audio synthesized successfully. Text length: %d chars"}"""
                .formatted(audioId, truncate(input, 100), input.length());
    }

    @Override
    public String getToolName() {
        return "tts";
    }

    @Override
    public String getDisplayName() {
        return "超拟人音频合成";
    }

    private String truncate(String text, int maxLen) {
        if (text.length() <= maxLen) return text.replace("\"", "\\\"");
        return text.substring(0, maxLen).replace("\"", "\\\"") + "...";
    }
}
