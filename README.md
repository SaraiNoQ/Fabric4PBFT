# Fabric4PBFT

Fabric4PBFT 是一个实验教学的 Hyperledger Fabric 审计交易项目。项目使用 TypeScript/JavaScript 和 Go 语言：TypeScript 负责 PBFT-style 仿真、Fabric 调用脚本、批量 workload 和结果分析；Go 负责 Fabric 链码。

Fabric 链码属于业务逻辑层，负责写入和查询账本状态；PBFT/BFT 属于排序和共识层。本项目用 TypeScript 写 PBFT-style simulator 来讲解 pre-prepare、prepare、commit，用 Docker Fabric + Go 链码来真实记录审计交易和 metadata。

## 1. 项目结构

```text
chaincode/audit/          Go 审计链码
src/fabric/               TypeScript Fabric 脚本
src/pbft/                 TypeScript PBFT-style simulator
src/metrics/              workload 结果分析
config/                   参数说明
docs/TEACHING_PLAN.md     课堂讲解顺序
```

核心脚本在 `package.json` 中：

```bash
npm run pbft:demo
npm run fabric:network:up
npm run fabric:deploy
npm run fabric:invoke
npm run fabric:query -- audit <audit_id>
npm run fabric:workload
npm run metrics:analyze
npm run fabric:network:down
```

## 2. 环境要求

建议使用 macOS 或 Linux。需要安装：

- Node.js >= 20
- npm
- Go >= 1.21
- Docker Desktop 或 Docker Engine
- Git 和 curl

还需要准备 `fabric-samples`。推荐目录结构如下：

```text
workspace/
  Fabric4PBFT/
  fabric-samples/
```

如果 `fabric-samples` 不在本项目上一级目录，需要设置：

```bash
export FABRIC_SAMPLES_DIR=/absolute/path/to/fabric-samples
```

## 3. 安装依赖

```bash
npm install
npm run typecheck
```

## 4. 跑 PBFT-style 仿真

默认 4 个节点、无故障节点：

```bash
npm run pbft:demo
```

模拟 4 个节点，其中节点 1 故障：

```bash
PBFT_NODES=4 PBFT_FAULTY=1 npm run pbft:demo
```

模拟 7 个节点，其中节点 1、2 故障：

```bash
PBFT_NODES=7 PBFT_FAULTY=1,2 npm run pbft:demo
```

输出文件：

```text
results/pbft-demo.json
```

课堂解释重点：PBFT 至少需要 `n >= 3f + 1`；prepare 和 commit 阶段需要达到 `2f + 1` 的阈值；消息开销主要来自 prepare 和 commit 的多节点广播。

## 5. 准备 Fabric samples

在工作目录下载 Fabric samples、binaries 和 Docker images：

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples
curl -sSL https://bit.ly/2ysbOFE | bash -s
```

然后回到本项目目录：

```bash
cd ../Fabric4PBFT
```

## 6. 启动 Fabric test-network

```bash
npm run fabric:network:up
```

这个脚本会在 `fabric-samples/test-network` 中执行：

```bash
./network.sh down
./network.sh up createChannel -ca
```

默认 channel 是 `mychannel`。

## 7. 部署 Go 审计链码

```bash
npm run fabric:deploy
```

该脚本会先在 `chaincode/audit` 下执行 `go mod tidy`，然后调用 Fabric test-network 的部署命令：

```bash
./network.sh deployCC -ccn auditcc -ccp <this_repo>/chaincode/audit -ccl go
```

默认链码名是 `auditcc`。

## 8. 提交和查询单条审计交易

提交：

```bash
npm run fabric:invoke
```

成功后会输出 `auditId`，例如：

```json
{
  "auditId": "audit_demo_...",
  "success": true,
  "latencyMs": 1800.123
}
```

查询单条记录：

```bash
npm run fabric:query -- audit audit_demo_xxx
```

按 round 查询：

```bash
npm run fabric:query -- round 1
```

## 9. 批量提交审计交易

默认运行：

```bash
npm run fabric:workload
```

默认参数：

```text
ROUNDS=5
CLIENTS_PER_ROUND=10
CONCURRENCY=4
SHARD_COUNT=2
METADATA_BYTES=256
```

更大的 workload：

```bash
ROUNDS=10 CLIENTS_PER_ROUND=20 CONCURRENCY=8 npm run fabric:workload
```

增大 metadata：

```bash
ROUNDS=5 CLIENTS_PER_ROUND=20 CONCURRENCY=8 METADATA_BYTES=4096 npm run fabric:workload
```

输出文件：

```text
results/fabric-workload.csv
results/fabric-workload-summary.json
```

## 10. 分析实验指标

```bash
npm run metrics:analyze
```

输出包括：

```text
total
success
failed
successRate
avgLatencyMs
p50LatencyMs
p95LatencyMs
p99LatencyMs
```

推荐实验表格：

```text
Rounds | Clients/Round | Concurrency | Metadata Bytes | Tx Count | Success Rate | Avg Latency | P95 | P99
```

## 11. Go 链码记录内容

链码函数：

```text
RecordAudit(audit_id, round_id, client_id, shard_id, update_hash, prototype_hash, metadata_json, created_at)
QueryAudit(audit_id)
QueryByRound(round_id)
```

账本记录结构：

```text
AuditID
RoundID
ClientID
ShardID
UpdateHash
PrototypeHash
MetadataJSON
CreatedAt
TxID
```

其中 `UpdateHash` 和 `PrototypeHash` 只保存哈希，不保存完整模型更新或完整原型数据。这样更适合审计场景，也能避免账本迅速膨胀。

## 12. 为什么链码里不生成时间戳

Fabric 链码应尽量保持确定性。多个 endorsing peers 会执行同一段链码逻辑，如果链码内部调用本地时间、随机数或外部网络请求，不同 peer 可能产生不同读写集，导致 endorsement 失败。因此本项目把 `created_at` 由 TypeScript 客户端生成后传入 Go 链码。

## 13. 明天教学推荐流程

1. 讲 Fabric 交易流程：client、peer、orderer、ledger。
2. 讲清楚链码不是 PBFT，共识发生在 ordering service。
3. 跑 `npm run pbft:demo`，解释 pre-prepare、prepare、commit。
4. 跑 `npm run fabric:network:up`，展示 Docker 容器。
5. 跑 `npm run fabric:deploy`，部署 Go 审计链码。
6. 跑 `npm run fabric:invoke`，提交单条审计交易。
7. 跑 `npm run fabric:query -- audit <audit_id>`，验证账本记录。
8. 跑 `npm run fabric:workload`，提交批量审计交易。
9. 跑 `npm run metrics:analyze`，解释成功率、平均延迟、P95、P99。
10. 最后说明：如果要做真正的 Fabric BFT ordering service，需要进一步配置 Fabric SmartBFT 或单独搭建 BFT orderer 网络。

## 14. 项目边界

本项目适合教学演示、审计链码原型、Fabric 审计交易压测、PBFT 基本流程讲解。

本项目暂不包含完整 Fabric SmartBFT 多 orderer 网络、生产级 Gateway SDK 客户端、CouchDB 富查询和 Caliper benchmark。后续如果要做严格 BFT 实验，应增加 Fabric SmartBFT ordering service 配置，或者把 TypeScript simulator 扩展成多进程 PBFT emulator。
