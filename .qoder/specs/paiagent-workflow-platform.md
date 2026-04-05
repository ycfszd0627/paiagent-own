# PaiAgent - AI Agent 工作流平台实施计划

## Context

构建一个全栈 AI Agent 工作流平台 "PaiAgent"，用户可以通过可视化拖拽方式编排 AI 工作流（DAG 流图），支持多种大模型节点和工具节点。核心场景：用户拖拽"输入→大模型→超拟人音频合成→输出"流程，调试时输入文字，经工作流执行后生成 AI 播客音频。

## 技术选型

| 层       | 技术                                  |
|----------|---------------------------------------|
| 前端     | React 18 + Vite + TypeScript + ReactFlow + Antd + Zustand |
| 后端     | Java 21 + Spring Boot 3.3 + Spring Data JPA + WebFlux(WebClient) |
| 数据库   | MySQL 8                               |
| 工作流   | 自研轻量级 DAG 引擎（拓扑排序 + 分阶段并行执行）|
| LLM      | OpenAI / DeepSeek / 通义千问（OpenAI 兼容接口）|

---

## 一、项目目录结构

### 1.1 根目录

```
paiagent-own/
├── paiagent-frontend/          # React 前端
├── paiagent-backend/           # Spring Boot 后端
└── docker-compose.yml          # MySQL 容器（可选）
```

### 1.2 前端 (`paiagent-frontend/`)

```
src/
├── main.tsx
├── App.tsx
├── api/                        # HTTP 客户端
│   ├── client.ts               # Axios 实例
│   ├── workflowApi.ts
│   └── executionApi.ts
├── components/
│   ├── layout/
│   │   ├── TopNavBar.tsx        # 顶部导航：新建/加载/保存/调试
│   │   └── AppLayout.tsx        # 三列布局
│   ├── sidebar/
│   │   ├── NodeLibrary.tsx      # 左侧节点库
│   │   ├── NodeCategory.tsx     # 可折叠分类
│   │   └── DraggableNodeItem.tsx
│   ├── canvas/
│   │   └── FlowCanvas.tsx       # ReactFlow 画布
│   ├── nodes/                   # 自定义节点组件
│   │   ├── BaseNode.tsx
│   │   ├── InputNode.tsx
│   │   ├── OutputNode.tsx
│   │   ├── LLMNode.tsx
│   │   ├── ToolNode.tsx
│   │   └── nodeRegistry.ts
│   ├── config-panel/
│   │   ├── NodeConfigPanel.tsx  # 右侧节点配置面板
│   │   ├── LLMConfigSection.tsx
│   │   └── ToolConfigSection.tsx
│   └── debug/
│       ├── DebugDrawer.tsx      # 调试抽屉
│       ├── DebugInput.tsx
│       ├── ExecutionTimeline.tsx # 执行进度时间线
│       └── DebugOutput.tsx      # 音频播放器
├── stores/                      # Zustand 状态管理
│   ├── useFlowStore.ts          # 节点/边状态（核心）
│   ├── useWorkflowStore.ts      # 工作流元数据
│   ├── useUIStore.ts            # UI 状态
│   └── useDebugStore.ts         # 调试执行状态
├── types/
│   ├── workflow.ts
│   ├── node.ts
│   └── execution.ts
└── styles/
    └── globals.css
```

### 1.3 后端 (`paiagent-backend/`)

```
src/main/java/com/paiagent/
├── PaiAgentApplication.java
├── config/
│   ├── WebConfig.java              # CORS
│   └── AsyncConfig.java            # 虚拟线程执行器（Java 21 Virtual Threads）
├── controller/
│   ├── WorkflowController.java     # 工作流 CRUD
│   ├── ExecutionController.java    # 工作流执行 + SSE
│   ├── NodeTypeController.java     # 节点类型列表
│   └── LLMProviderController.java  # LLM 配置管理
├── dto/                                # Java 21 Record 类
│   ├── request/
│   │   ├── WorkflowSaveRequest.java    # record
│   │   └── WorkflowExecuteRequest.java # record
│   └── response/
│       ├── WorkflowResponse.java       # record
│       ├── ExecutionResponse.java      # record
│       └── NodeTypeResponse.java       # record
├── entity/
│   ├── Workflow.java
│   ├── WorkflowNode.java
│   ├── WorkflowEdge.java
│   ├── LLMProvider.java
│   └── ExecutionLog.java
├── repository/                     # Spring Data JPA
│   ├── WorkflowRepository.java
│   ├── WorkflowNodeRepository.java
│   ├── WorkflowEdgeRepository.java
│   ├── LLMProviderRepository.java
│   └── ExecutionLogRepository.java
├── service/
│   ├── WorkflowService.java
│   ├── ExecutionService.java
│   └── NodeTypeRegistryService.java
├── engine/                         # ★ DAG 工作流引擎（核心）
│   ├── WorkflowEngine.java         # 主入口：解析→排序→执行
│   ├── DAGParser.java              # JSON → DAG 内存结构
│   ├── TopologicalSorter.java      # Kahn 拓扑排序
│   ├── ExecutionContext.java       # 节点间数据传递（ConcurrentHashMap）
│   ├── ExecutionPlan.java          # 分阶段执行计划
│   ├── NodeExecutor.java           # 节点执行器接口（sealed interface）
│   ├── ParallelStageExecutor.java  # 虚拟线程并行执行（Java 21 Virtual Threads）
│   ├── model/
│   │   ├── DAG.java                # 邻接表图结构
│   │   ├── DAGNode.java
│   │   └── DAGEdge.java
│   └── executor/                   # 各类型节点执行器
│       ├── InputNodeExecutor.java
│       ├── OutputNodeExecutor.java
│       ├── LLMNodeExecutor.java
│       └── ToolNodeExecutor.java
├── llm/                            # ★ LLM 统一适配层
│   ├── LLMAdapter.java             # 接口：chat(request) → response
│   ├── LLMAdapterFactory.java      # 工厂：provider name → adapter
│   ├── LLMRequest.java
│   ├── LLMResponse.java
│   ├── OpenAICompatibleAdapter.java # 基类（三家 API 格式兼容）
│   └── adapters/
│       ├── OpenAIAdapter.java
│       ├── DeepSeekAdapter.java
│       └── TongyiQianwenAdapter.java
├── tool/                           # ★ 可插拔工具系统
│   ├── ToolPlugin.java             # 接口
│   ├── ToolPluginRegistry.java     # 自动发现注册
│   └── plugins/
│       └── TTSToolPlugin.java      # 超拟人音频合成
└── exception/
    ├── GlobalExceptionHandler.java
    ├── DAGCycleException.java
    └── NodeExecutionException.java
```

---

## 二、数据库设计

### workflows 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增 |
| name | VARCHAR(200) | 工作流名称 |
| description | TEXT | 描述 |
| status | VARCHAR(20) | DRAFT/PUBLISHED |
| canvas_json | JSON | ReactFlow 视口状态 |
| created_at / updated_at | DATETIME | 时间戳 |

### workflow_nodes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增 |
| workflow_id | BIGINT FK | 所属工作流 |
| node_id | VARCHAR(50) | 前端 UUID |
| node_type | VARCHAR(30) | INPUT/OUTPUT/LLM/TOOL |
| node_subtype | VARCHAR(50) | deepseek/tongyi/tts 等 |
| label | VARCHAR(200) | 显示名称 |
| position_x / position_y | DOUBLE | 画布坐标 |
| config_json | JSON | 节点配置（模型/温度/prompt 等）|

### workflow_edges 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增 |
| workflow_id | BIGINT FK | 所属工作流 |
| edge_id | VARCHAR(50) | 前端 UUID |
| source_node_id / target_node_id | VARCHAR(50) | 源/目标节点 |
| source_port / target_port | VARCHAR(50) | 端口名 |

### llm_providers 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增 |
| name | VARCHAR(50) UNIQUE | openai/deepseek/tongyi |
| display_name | VARCHAR(100) | 显示名 |
| base_url | VARCHAR(500) | API 地址 |
| api_key | VARCHAR(500) | API 密钥（加密存储）|
| default_model | VARCHAR(100) | 默认模型 |
| is_enabled | BOOLEAN | 是否启用 |

### execution_logs 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增 |
| workflow_id | BIGINT FK | 所属工作流 |
| status | VARCHAR(20) | RUNNING/SUCCESS/FAILED |
| input_data / output_data | TEXT | 输入/输出 |
| step_details | JSON | 每节点执行日志 |
| duration_ms | BIGINT | 执行耗时 |
| started_at / finished_at | DATETIME | 时间戳 |

---

## 三、REST API 设计

### 工作流 CRUD
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/workflows` | 创建工作流 |
| GET | `/api/v1/workflows` | 列表（分页）|
| GET | `/api/v1/workflows/{id}` | 获取详情（含节点/边）|
| PUT | `/api/v1/workflows/{id}` | 更新工作流 |
| DELETE | `/api/v1/workflows/{id}` | 删除 |

### 工作流执行
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/workflows/{id}/execute` | 同步执行 |
| POST | `/api/v1/workflows/{id}/execute/stream` | SSE 流式执行 |
| GET | `/api/v1/workflows/{id}/executions` | 执行历史 |

### 节点类型 & LLM 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/node-types` | 可用节点类型列表 |
| GET/POST/PUT | `/api/v1/llm-providers` | LLM 服务商管理 |

### SSE 事件格式
- `event: node-start` → `{ "nodeId": "...", "label": "通义千问", "status": "RUNNING" }`
- `event: node-complete` → `{ "nodeId": "...", "output": "...", "durationMs": 1200 }`
- `event: workflow-complete` → `{ "finalOutput": "...", "audioUrl": "..." }`

---

## 四、DAG 工作流引擎核心设计

```
WorkflowEngine.execute(workflowId, userInput)
  │
  ├─ DAGParser.parse(nodes, edges) → DAG        // 构建邻接表
  │     └─ 校验：无环、有唯一输入/输出节点
  │
  ├─ TopologicalSorter.sort(DAG) → ExecutionPlan // Kahn 算法
  │     └─ 将同层无依赖节点分组为 Stage（可并行）
  │
  └─ 逐 Stage 执行:
        ParallelStageExecutor.execute(stage, context)
          └─ 对 Stage 中每个节点:
               NodeExecutor.execute(node, context)
               └─ 根据类型分派：
                    INPUT  → 将 userInput 存入 context
                    LLM    → LLMAdapterFactory → adapter.chat()
                    TOOL   → ToolPluginRegistry → plugin.execute()
                    OUTPUT → 从 context 提取最终结果
```

**关键设计决策：**
- **Java 21 特性**：使用虚拟线程（Virtual Threads）替代传统线程池执行并行节点，轻量高效、无需手动调优线程池参数；使用 Record 类定义 DTO；使用 sealed interface 约束节点执行器类型；使用 switch 模式匹配简化节点类型分派
- **LLM 适配**：三家厂商均兼容 OpenAI 格式，共用 `OpenAICompatibleAdapter` 基类，仅参数化 baseUrl 和 authHeader
- **执行流式推送**：使用 SSE（`SseEmitter`），单向推送足够，比 WebSocket 简单
- **并行执行**：同一拓扑层的独立节点通过虚拟线程 + `StructuredTaskScope` 并行执行，自动管理子任务生命周期
- **节点配置**：使用 JSON 字段存储，不同节点类型配置 schema 不同，应用层校验
- **Tomcat 虚拟线程**：Spring Boot 3.3 配置 `spring.threads.virtual.enabled=true`，所有请求处理自动使用虚拟线程

---

## 五、分步实施顺序

### Phase 1: 项目脚手架
1. 初始化 Spring Boot 后端（Maven），配置 MySQL 连接、CORS
2. Flyway 数据库迁移脚本 `V1__init_schema.sql`
3. 初始化 React 前端（Vite + TS），安装 ReactFlow/Antd/Zustand/Tailwind
4. 搭建前端三列布局 `AppLayout`，空白 ReactFlow 画布

### Phase 2: 工作流画布
5. 左侧节点库 `NodeLibrary`，拖拽节点项 `DraggableNodeItem`
6. 自定义 ReactFlow 节点组件：`InputNode`、`LLMNode`、`ToolNode`、`OutputNode`
7. 画布拖放交互：`onDrop` + `useFlowStore` 状态管理
8. 右侧节点配置面板 `NodeConfigPanel`

### Phase 3: 工作流持久化
9. 后端 JPA 实体 + Repository + Service + Controller（CRUD）
10. 前端保存/加载功能，序列化/反序列化 Flow 状态
11. 前端 DAG 环检测校验

### Phase 4: DAG 工作流引擎
12. `DAGParser`：从数据库加载并构建内存 DAG
13. `TopologicalSorter`：Kahn 拓扑排序生成 ExecutionPlan
14. `ExecutionContext`：基于 ConcurrentHashMap 的节点间数据传递
15. 各类型 `NodeExecutor` 实现
16. `WorkflowEngine` 主控编排

### Phase 5: LLM 集成
17. `LLMAdapter` 接口 + `OpenAICompatibleAdapter` 基类
18. `OpenAIAdapter` / `DeepSeekAdapter` / `TongyiQianwenAdapter` 实现
19. `LLMNodeExecutor` 对接适配层

### Phase 6: 工具系统
20. `ToolPlugin` 接口 + `ToolPluginRegistry` 自动发现
21. `TTSToolPlugin` 音频合成实现（先 Mock，后接真实 TTS API）
22. `ToolNodeExecutor` 对接工具注册表

### Phase 7: 调试面板
23. 后端 SSE 执行接口（`SseEmitter`）
24. 前端 `DebugDrawer` + `EventSource` 订阅
25. `ExecutionTimeline` 实时进度 + `AudioPlayer` 音频播放

### Phase 8: 完善
26. 全局异常处理 + 错误提示
27. LLM 调用重试机制
28. 执行历史查看
29. UI 细节打磨（加载态、快捷键、画布控制）

---

## 六、关键依赖

### 前端
- react / react-dom ^18.3
- reactflow ^11.11
- zustand ^4.5
- antd ^5.x / @ant-design/icons ^5.x
- axios ^1.7
- tailwindcss ^3.4
- nanoid ^5.x

### 后端
- Java 21（虚拟线程、Record、sealed interface、模式匹配）
- spring-boot-starter-web (3.3.x)
- spring-boot-starter-data-jpa
- spring-boot-starter-validation
- spring-boot-starter-webflux（WebClient 调 LLM API）
- mysql-connector-j
- flyway-core + flyway-mysql
- lombok
- mapstruct

---

## 七、验证方案

1. **后端启动验证**：`mvn spring-boot:run`，确认 MySQL 连接成功、Flyway 迁移完成
2. **前端启动验证**：`npm run dev`，确认画布渲染、节点拖拽正常
3. **CRUD 验证**：创建工作流 → 拖拽节点连线 → 保存 → 刷新加载 → 数据一致
4. **引擎验证**：保存一个 "输入→LLM→输出" 工作流 → 调用执行 API → 检查返回结果
5. **SSE 验证**：调试抽屉输入文字 → 观察时间线实时更新 → 最终输出显示
6. **音频验证**：完整流程 "输入→通义千问→TTS→输出" → 生成音频 → 播客播放
