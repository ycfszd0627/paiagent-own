# PaiAgent Own

PaiAgent Own 是一个可视化 AI 工作流平台，包含前端拖拽画布和后端工作流执行引擎。

项目当前分为两个模块：

- `paiagent-frontend/`：基于 Vite + React + TypeScript 的前端界面
- `paiagent-backend/`：基于 Spring Boot 的后端服务

## 项目结构

```text
paiagent-own/
├─ paiagent-frontend/
├─ paiagent-backend/
├─ 代码说明-中文版.md
└─ README.md
```

## 功能概览

- 可视化拖拽节点编排工作流
- 支持 `INPUT`、`OUTPUT`、`LLM`、`TOOL` 等节点类型
- 支持保存、加载、执行工作流
- 后端基于 DAG 拓扑排序执行节点
- 支持执行日志记录与历史查询

## 快速启动

### 前端

```bash
cd paiagent-frontend
npm install
npm run dev
```

### 后端

```bash
cd paiagent-backend
mvn spring-boot:run
```

默认情况下：

- 前端开发环境由 Vite 启动
- 后端运行在 `8080` 端口
- 后端需要本地 MySQL，并会通过 Flyway 自动初始化表结构

## 构建与检查

### 前端构建

```bash
cd paiagent-frontend
npm run build
```

### 后端测试

```bash
cd paiagent-backend
mvn test
```

### 后端打包

```bash
cd paiagent-backend
mvn package
```

## 配置说明

后端主要配置位于：

- `paiagent-backend/src/main/resources/application.yml`

请重点关注：

- MySQL 连接配置
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `TONGYI_API_KEY`
- MinIO 配置

不要把真实密钥直接写进代码。

## 学习文档

根目录已提供中文版代码说明，适合快速理解项目结构和执行流程：

- [代码说明-中文版.md](./代码说明-中文版.md)

## 建议阅读顺序

1. 先看根目录中文说明文档
2. 再看前端 `AppLayout`、`TopNavBar`、`FlowCanvas`
3. 然后看后端 `WorkflowController`、`ExecutionService`、`WorkflowEngine`
4. 最后深入各类节点执行器和适配器实现

## 说明

这是一个适合学习“可视化工作流 + DAG 执行引擎 + AI 节点编排”思路的项目。
