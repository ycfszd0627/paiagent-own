-- PaiAgent Database Schema

CREATE TABLE IF NOT EXISTS workflows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    canvas_json JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_nodes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    node_id VARCHAR(50) NOT NULL,
    node_type VARCHAR(30) NOT NULL COMMENT 'INPUT, OUTPUT, LLM, TOOL',
    node_subtype VARCHAR(50) COMMENT 'deepseek, tongyi, openai, tts, etc.',
    label VARCHAR(200) NOT NULL,
    position_x DOUBLE NOT NULL DEFAULT 0,
    position_y DOUBLE NOT NULL DEFAULT 0,
    config_json JSON NOT NULL,
    CONSTRAINT fk_node_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    INDEX idx_node_workflow (workflow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_edges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    edge_id VARCHAR(50) NOT NULL,
    source_node_id VARCHAR(50) NOT NULL,
    source_port VARCHAR(50) NOT NULL DEFAULT 'default',
    target_node_id VARCHAR(50) NOT NULL,
    target_port VARCHAR(50) NOT NULL DEFAULT 'default',
    CONSTRAINT fk_edge_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    INDEX idx_edge_workflow (workflow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llm_providers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    default_model VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS execution_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL COMMENT 'RUNNING, SUCCESS, FAILED',
    input_data TEXT,
    output_data TEXT,
    step_details JSON,
    error_message TEXT,
    duration_ms BIGINT,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    CONSTRAINT fk_exec_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    INDEX idx_exec_workflow (workflow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default LLM providers
INSERT INTO llm_providers (name, display_name, base_url, api_key, default_model) VALUES
('openai', 'OpenAI', 'https://api.openai.com/v1', '', 'gpt-4o-mini'),
('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', '', 'deepseek-chat'),
('tongyi', '通义千问', 'https://dashscope.aliyuncs.com/compatible-mode/v1', '', 'qwen-max');
