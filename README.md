# Fabric4PBFT

Fabric4PBFT 是一个面向实验教学的 Hyperledger Fabric 审计交易项目。项目只使用两类语言：

- TypeScript / JavaScript：PBFT-style 共识仿真、Fabric 网络控制脚本、审计交易提交脚本、批量 workload、实验结果分析。
- Go：Fabric 链码。链码是 Fabric 中最适合使用 Go 的部分，因此这里保留 Go。

本项目的教学重点不是“在链码里实现 PBFT”。正确理解是：

- PBFT/BFT 属于共识层或排序服务层。
- Fabric 链码属于业务逻辑层，负责读写账本状态。
- 本项目用 TypeScript 写 PBFT-style simulator 来解释 PBFT 三阶段流程；用 Docker Fabric 网络和 Go 链码来真实记录审计交易和 metadata。

## 1. 项目结构

```text
Fabric4PBFT/
  chaincode/audit/          Go 审计链码
    main.go
    audit_contract.go
    go.mod

  src/fabric/               TypeScript Fabric 调用脚本
    network.ts              启停 fabric-samples/test-network
    deploy.ts               部署 Go 链码
    peerCli.ts              peer chaincode invoke/query 封装
    auditClient.ts          审计交易客户端
    invokeOne.ts            单条交易 smoke test
    query.ts                查询审计记录
    workload.ts             批量审计交易压测

  src/pbft/                 TypeScript PBFT-style simulator
    types.ts
    simulator.ts
    demo.ts

  src/metrics/
    analyze.ts              分析 workload 结果

  config/
    workload.example.json   workload 参数说明

  docs/
    TEACHING_PLAN.md        课堂讲解顺序
```

## 2. 先讲清楚的概念

Fabric 的交易流程可以简化成：

```text
client application
  -> endorsing peers
  -> ordering service
  -> validating and committing peers
  -> ledger world state / block files
```

Go 链码只负责下面这件事：

```text
RecordAudit(audit_id, round_id, client_id, shard_id, update_hash, prototype_hash, metadata_json, created_at)
```

也就是把审计交易写到账本里。它不负责 PBFT 的 pre-prepare、prepare、commit。

PBFT-style simulator 负责解释下面这件事：

```text
client request
  -> pre-prepare
  -> prepare
  -> commit
  -> consensus reached or failed
```

所以本项目是两条实验线：

1. PBFT-style simulator：用于教学解释 PBFT 容错关系和消息流程。
2. Fabric audit ledger：用于真实记录审计交易并测量链上审计开销。

## 3. 环境要求

建议环境：

- macOS / Linux
- Node.js >= 20
- npm
- Go >= 1.21
- Docker Desktop 或 Docker Engine
- Git
- curl

Fabric 部分依赖 `fabric-samples/test-network`。推荐把 `fabric-samples` 克隆到本项目的上一级目录：

```text
workspace/
  Fabric4PBFT/
  fabric-samples/
```

如果你放在别的位置，需要设置环境变量：

```bash
export FABRIC_SAMPLES_DIR=/absolute/path/to/fabric-samples
```

## 4. 安装依赖

在本项目根目录执行：

```bash
npm install
```

然后检查 TypeScript 类型：

```bash
npm run typecheck
```

## 5. 跑 PBFT-style 仿真

最小运行：

```bash
npm run pbft:demo
```

默认参数：

```text
PBFT_NODES=4
PBFT_FAULTY=
PBFT_VIEW=0
PBFT_BASE_DELAY_MS=20
PBFT_JITTER_MS=10
```

模拟 4 个节点、1 个故障节点：

```bash
PBFT_NODES=4 PBFT_FAULTY=1 npm run pbft:demo
```

模拟 7 个节点、2 个故障节点：

```bash
PBFT_NODES=7 PBFT_FAULTY=1,2 npm run pbft:demo
```

输出会写入：

```text
results/pbft-demo.json
```

课堂解释重点：

- `n >= 3f + 1`
- prepared threshold: `2f + 1`
- committed threshold: `2f + 1`
- primary 如果故障，pre-prepare 阶段可能直接失败
- PBFT 的主要开销来自 prepare 和 commit 阶段的多节点广播

## 6. 准备 Fabric test-network

先下载 Fabric samples、binaries 和 Docker images。可以参考 Fabric 官方的 getting started 流程。常见做法是：

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples
curl -sSL https://bit.ly/2ysbOFE | bash -s
```

然后回到本项目目录。

如果目录结构是：

```text
workspace/
  Fabric4PBFT/
  fabric-samples/
```

可以直接运行下面的命令。否则先设置：

```bash
export FABRIC_SAMPLES_DIR=/absolute/path/to/fabric-samples
```

## 7. 启动 Fabric 网络

```bash
npm run fabric:network:up
```

这个脚本会执行两件事：

1. 清理旧网络：`./network.sh down`
2. 启动 test-network 并创建 channel：`./network.sh up createChannel -ca`

默认 channel 是：

```text
mychannel
```

## 8. 部署 Go 审计链码

```bash
npm run fabric:deploy
```

它等价于在 `fabric-samples/test-network` 中执行：

```bash
./network.sh deployCC -ccn auditcc -ccp <this_repo>/chaincode/audit -ccl go
```

默认链码名：

```text
auditcc
```

如果你要改 channel 或链码名，可以使用：

```bash
export FABRIC_CHANNEL=mychannel
export FABRIC_CHAINCODE=auditcc
```

## 9. 提交单条审计交易

```bash
npm run fabric:invoke
```

成功后会输出类似：

```json
{
  "auditId": "audit_demo_...",
  "success": true,
  "latencyMs": 1800.123,
  "stdout": "...",
  "stderr": "..."
}
```

记下 `auditId`，然后查询：

```bash
npm run fabric:query -- audit audit_demo_xxx
```

按 round 查询：

```bash
npm run fabric:query -- round 1
```

## 10. 批量提交审计交易

默认参数运行：

```bash
npm run fabric:workload
```

默认 workload：

```text
ROUNDS=5
CLIENTS_PER_ROUND=10
CONCURRENCY=4
SHARD_COUNT=2
METADATA_BYTES=256
```

更大的实验：

```bash
ROUNDS=10 CLIENTS_PER_ROUND=20 CONCURRENCY=8 npm run fabric:workload
```

调 metadata 大小：

```bash
ROUNDS=5 CLIENTS_PER_ROUND=20 CONCURRENCY=8 METADATA_BYTES=4096 npm run fabric:workload
```

输出文件：

```text
results/fabric-workload.csv
results/fabric-workload-summary.json
```

## 11. 分析实验结果

```bash
npm run metrics:analyze
```

它会输出：

```json
{
  "total": 50,
  "success": 50,
  "failed": 0,
  "successRate": 1,
  "avgLatencyMs": 1234.5,
  "p50LatencyMs": 1200.1,
  "p95LatencyMs": 1800.2,
  "p99LatencyMs": 2000.3
}
```

建议实验表格：

```text
Rounds | Clients/Round | Concurrency | Metadata Bytes | Tx Count | Success Rate | Avg Latency | P95 | P99
```

## 12. 审计链码记录了什么

Go 链码中的 `AuditRecord` 结构如下：

```go
type AuditRecord struct {
    AuditID       string
    RoundID       string
    ClientID      string
    ShardID       string
    UpdateHash    string
    PrototypeHash string
    MetadataJSON  string
    CreatedAt     string
    TxID          string
}
```

含义：

- `AuditID`：审计记录唯一 ID。
- `RoundID`：联邦学习或仿真实验轮次。
- `ClientID`：客户端编号。
- `ShardID`：分片编号。
- `UpdateHash`：模型更新或交易 payload 的 hash。
- `PrototypeHash`：原型、摘要或中间表示的 hash。
- `MetadataJSON`：附加审计信息，例如 loss、accuracy、样本量、攻击标记。
- `CreatedAt`：客户端生成的时间戳。
- `TxID`：Fabric 交易 ID。

注意：链码不直接保存完整模型更新，只保存 hash 和 metadata。这更适合审计场景，也避免账本膨胀过快。

## 13. 为什么链码里不生成时间戳

Fabric 链码需要尽量保持确定性。多个 endorsing peers 会执行同一个链码逻辑，如果链码内部调用本地时间、随机数、外部网络请求，就可能导致不同 peer 的执行结果不一致，最终 endorsement 失败。

所以本项目把 `created_at` 从 TypeScript 客户端传入链码，而不是在 Go 链码里调用 `time.Now()`。

## 14. 明天教学推荐流程

按下面顺序讲，最稳：

1. 先讲 Fabric 交易流程：client、peer、orderer、ledger。
2. 再讲为什么链码不是 PBFT。
3. 跑 `npm run pbft:demo`，解释 pre-prepare、prepare、commit。
4. 跑 `npm run fabric:network:up`，展示 Docker 网络。
5. 跑 `npm run fabric:deploy`，部署 Go 链码。
6. 跑 `npm run fabric:invoke`，提交单条审计交易。
7. 跑 `npm run fabric:query -- audit <audit_id>`，验证账本记录。
8. 跑 `npm run fabric:workload`，提交批量审计交易。
9. 跑 `npm run metrics:analyze`，解释平均延迟、P95、P99、成功率。
10. 最后讲如果要做真正 BFT ordering service，需要进一步配置 Fabric SmartBFT 或单独搭 BFT ordering 网络。

## 15. 常见问题

### 1. 这个项目是不是实现了真正的 Fabric PBFT？

不是。项目中 PBFT 是 TypeScript simulator，用于教学解释 PBFT-style 流程。Fabric 部分是审计交易链路，用于真实落账和性能测试。

### 2. 为什么不用 Python？

因为本项目要求主语言改成 JavaScript / TypeScript，只在必须时用 Go。因此 Fabric 调用脚本、PBFT 仿真和实验统计都用 TypeScript 编写。

### 3. 为什么 Go 还保留？

因为 Fabric 链码非常适合用 Go 编写，官方示例和生产项目也大量使用 Go 链码。这里 Go 只用于 `chaincode/audit`。

### 4. 运行 `peer` 命令找不到怎么办？

确认已经下载 Fabric binaries，并且 `fabric-samples/bin` 存在。本项目的 TypeScript 脚本会自动把 `fabric-samples/bin` 加到 PATH。如果 `fabric-samples` 不在本项目上一级目录，需要设置：

```bash
export FABRIC_SAMPLES_DIR=/absolute/path/to/fabric-samples
```

### 5. Docker 网络启动失败怎么办？

先清理：

```bash
npm run fabric:network:down
```

然后重新启动：

```bash
npm run fabric:network:up
```

还不行就检查 Docker 是否正在运行。

## 16. 项目边界

本项目适合：

- 教学演示 Fabric 审计链码。
- 教学解释 PBFT 基本流程。
- 做审计交易 workload 压测。
- 为论文中的 Fabric audit prototype 提供实验骨架。

本项目暂不包含：

- 完整 Fabric SmartBFT 多 orderer 网络配置。
- 生产级 Gateway SDK 客户端。
- CouchDB 富查询。
- Caliper benchmark 集成。

如果后续要把它升级成更严格的 BFT 实验，应增加 Fabric SmartBFT ordering service 配置，或者把 TypeScript PBFT simulator 扩展成多进程、多节点、可注入 Byzantine 行为的 emulator。
