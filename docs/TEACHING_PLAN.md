# 教学讲解顺序

## 1. 概念

Fabric 链码负责业务状态读写；交易排序和共识发生在 ordering service。这个项目因此分成两条线：

1. TypeScript PBFT style simulator：用于解释 PBFT 的 pre-prepare、prepare、commit 三阶段和 n >= 3f + 1 的容错关系。
2. Docker Fabric + Go audit chaincode：用于真实提交审计交易，观察 Fabric 的背书、排序、提交、账本记录和性能指标。

## 2. 结构

Client workload -> endorsement by peers -> ordering service -> validation and commit -> ledger world state and block files.

然后强调：PBFT/BFT 属于 ordering/consensus layer；audit chaincode 属于 application/state layer。

## 3. 实验步骤

1. PBFT 仿真：npm run pbft:demo
2. 启动 Fabric test-network：npm run fabric:network:up
3. 部署 Go 审计链码：npm run fabric:deploy
4. 提交单条审计交易：npm run fabric:invoke
5. 查询审计交易：npm run fabric:query -- audit <audit_id>
6. 批量提交审计交易：npm run fabric:workload
7. 分析性能指标：npm run metrics:analyze

## 4. 问题

- Fabric test-network 和真正 BFT ordering service 的区别是什么？
- 并发数升高时，吞吐和尾延迟会怎样变化？
