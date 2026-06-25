# 教学讲解顺序

这份项目适合按 60 到 90 分钟实验课讲解。

## 1. 先纠正概念

Fabric 链码不是 PBFT 共识算法的实现位置。链码负责业务状态读写；交易排序和共识发生在 ordering service。这个项目因此分成两条线：

1. TypeScript PBFT style simulator：用于解释 PBFT 的 pre-prepare、prepare、commit 三阶段和 n >= 3f + 1 的容错关系。
2. Docker Fabric + Go audit chaincode：用于真实提交审计交易，观察 Fabric 的背书、排序、提交、账本记录和性能指标。

## 2. 建议板书结构

Client workload -> endorsement by peers -> ordering service -> validation and commit -> ledger world state and block files.

然后强调：PBFT/BFT 属于 ordering/consensus layer；audit chaincode 属于 application/state layer。

## 3. 实验步骤

1. 跑 PBFT 仿真：npm run pbft:demo
2. 启动 Fabric test-network：npm run fabric:network:up
3. 部署 Go 审计链码：npm run fabric:deploy
4. 提交单条审计交易：npm run fabric:invoke
5. 查询审计交易：npm run fabric:query -- audit <audit_id>
6. 批量提交审计交易：npm run fabric:workload
7. 分析性能指标：npm run metrics:analyze

## 4. 推荐课堂问题

- 为什么链码里不能使用随机数和本地时间？
- 为什么 PBFT 至少需要 n >= 3f + 1 个节点？
- 审计交易为什么只上链 hash 和 metadata，而不是完整模型更新？
- Fabric test-network 和真正 BFT ordering service 的区别是什么？
- 并发数升高时，吞吐和尾延迟会怎样变化？

## 5. 论文或报告中的推荐写法

推荐写：We use a Fabric-based audit ledger prototype to record hash-only audit transactions and evaluate the overhead of blockchain-backed audit logging. PBFT-style behavior is studied using a TypeScript simulator, while the Fabric prototype measures the cost of submitting audit metadata to a permissioned ledger.

不要写：We implement PBFT in chaincode.

后者是错的，因为链码不是 Fabric 共识算法的实现位置。
