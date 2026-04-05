# TTS 代码说明

## 一、整体作用

当前“超拟人音频合成”节点的核心实现主要在：

- [paiagent-backend/src/main/java/com/paiagent/tool/plugins/TTSToolPlugin.java](D:\AI\agentTest\paiagent-own\paiagent-backend\src\main\java\com\paiagent\tool\plugins\TTSToolPlugin.java)

这个节点的完整处理流程是：

1. 读取上游节点输出的文本。
2. 将长文本按句子边界切分成多个分片。
3. 并发调用 TTS 接口生成每个分片的音频。
4. 下载每个分片对应的音频文件。
5. 使用 `ffmpeg` 将每段音频统一转成 mp3。
6. 把每个分片音频上传到 MinIO。
7. 按原始顺序合并所有音频分片。
8. 将合并后的完整音频再次上传到 MinIO。
9. 把最终 `audioUrl` 返回给前端播放。

前端相关配置入口在：

- [paiagent-frontend/src/components/config-panel/NodeConfigPanel.tsx](D:\AI\agentTest\paiagent-own\paiagent-frontend\src\components\config-panel\NodeConfigPanel.tsx)
- [paiagent-frontend/src/components/canvas/FlowCanvas.tsx](D:\AI\agentTest\paiagent-own\paiagent-frontend\src\components\canvas\FlowCanvas.tsx)

## 二、后端执行流程

入口方法是 `execute(String input, Map<String, Object> config)`。

这里会先读取节点配置中的关键参数，包括：

- `baseUrl`
- `apiKey`
- `model`
- `voice`
- `language_type`

然后调用 `splitForTts(...)` 对大模型输出文本进行分片。

分片规则不是简单按长度硬切，而是优先在这些标点处截断：

- `。`
- `！`
- `？`
- `；`
- `，`

这样做的目的是尽量保证每段文本语义完整，避免一句话被截断后影响语音合成效果。

## 三、并发处理逻辑

分片后的并发处理发生在 `processChunksInParallel(...)`。

这里会创建固定大小线程池，然后把每个分片交给 `processSingleChunk(...)` 处理。

每个分片内部会依次做四件事：

1. `requestTtsAudioUrl(...)`
   调用 DashScope TTS 接口，拿到该分片的临时音频 URL。

2. `downloadAudio(...)`
   用 JDK `HttpClient` 下载返回的 OSS 临时签名地址。

3. `convertToMp3(...)`
   使用 `ffmpeg` 把下载回来的音频统一转成 mp3，方便后续合并。

4. `minioStorageService.uploadFile(...)`
   将分片音频上传到 MinIO。

需要注意的是：

- 分片请求是并发的。
- 但最终合并前会按照 `index` 重新排序。

这意味着：

- 可以提升 TTS 处理速度。
- 但不会打乱最终音频顺序。

## 四、音频合并逻辑

所有分片处理完成后，会调用 `mergeMp3Files(...)`。

这里会先生成一个 `concat.txt` 文件，然后通过 `ffmpeg concat` 按顺序把多个 mp3 拼接成一个完整音频。

最终生成的完整音频会再次上传到 MinIO，并返回合并后的 `audioUrl`。

## 五、MinIO 存储逻辑

MinIO 上传逻辑在：

- [paiagent-backend/src/main/java/com/paiagent/storage/MinioStorageService.java](D:\AI\agentTest\paiagent-own\paiagent-backend\src\main\java\com\paiagent\storage\MinioStorageService.java)

为了避免文件重名覆盖，现在对象名采用时间戳方式组织，例如：

- `tts/{timestamp}/chunks/{timestamp}-chunk-{index}.mp3`
- `tts/{timestamp}/merged/{timestamp}-merged.mp3`

这样即使多次执行同一个工作流，也不会因为文件名重复而覆盖旧文件。

## 六、前端如何播放音频

前端播放逻辑在：

- [paiagent-frontend/src/components/debug/DebugDrawer.tsx](D:\AI\agentTest\paiagent-own\paiagent-frontend\src\components\debug\DebugDrawer.tsx)

后端返回的是一个 JSON 字符串，里面包含：

- `audioUrl`
- `chunkCount`
- `chunks`
- `model`
- `voice`
- `language_type`
- `jobId`

前端会解析这个 JSON，只要存在 `audioUrl`，就自动渲染 HTML 的音频播放器。

## 七、为什么这样设计

这套实现有几个关键设计点：

1. 文本先分片，再做 TTS  
   这样可以避免一次性传入太长文本导致 TTS 超时或生成失败。

2. 分片并发请求  
   可以明显提升整体语音生成速度。

3. 最终按索引排序再合并  
   并发不会影响最终音频顺序。

4. 下载 OSS 临时地址时使用 JDK `HttpClient`  
   可以避免 query 参数被重新编码，导致签名失效。

5. 所有分片统一转 mp3 后再合并  
   可以降低不同音频格式直接拼接失败的风险。

6. 上传到 MinIO 后返回统一地址  
   前端不需要关心分片细节，直接播放最终音频即可。

## 八、建议重点学习的代码路径

如果你要系统理解这部分代码，建议按这个顺序阅读：

1. [paiagent-frontend/src/components/config-panel/NodeConfigPanel.tsx](D:\AI\agentTest\paiagent-own\paiagent-frontend\src\components\config-panel\NodeConfigPanel.tsx)
   先看前端如何配置 TTS 节点参数。

2. [paiagent-backend/src/main/java/com/paiagent/engine/executor/ToolNodeExecutor.java](D:\AI\agentTest\paiagent-own\paiagent-backend\src\main\java\com\paiagent\engine\executor\ToolNodeExecutor.java)
   再看工具节点如何接收上游文本并调用插件。

3. [paiagent-backend/src/main/java/com/paiagent/tool/plugins/TTSToolPlugin.java](D:\AI\agentTest\paiagent-own\paiagent-backend\src\main\java\com\paiagent\tool\plugins\TTSToolPlugin.java)
   这是整条 TTS 链路的核心。

4. [paiagent-backend/src/main/java/com/paiagent/storage/MinioStorageService.java](D:\AI\agentTest\paiagent-own\paiagent-backend\src\main\java\com\paiagent\storage\MinioStorageService.java)
   最后看 MinIO 上传和外链生成。

如果你需要，我下一步可以继续为这份文档补一版“逐方法讲解”，把 `TTSToolPlugin` 里的每个方法单独拆开解释。  
