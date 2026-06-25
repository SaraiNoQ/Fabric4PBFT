import { createHash } from 'node:crypto';
import type { PBFTConfig, PBFTRequest, PBFTSimulationResult, PBFTPhaseMetrics } from './types.js';

export class PBFTSimulator {
  private readonly config: PBFTConfig;
  private readonly faultySet: Set<number>;

  constructor(config: PBFTConfig) {
    if (config.nodeCount < 4) {
      throw new Error('PBFT teaching demo expects at least 4 nodes');
    }
    this.config = config;
    this.faultySet = new Set(config.faultyNodeIds);
  }

  run(request: PBFTRequest): PBFTSimulationResult {
    const n = this.config.nodeCount;
    const f = Math.floor((n - 1) / 3);
    const primaryId = this.config.view % n;
    const primaryFaulty = this.faultySet.has(primaryId);
    const honestNodeIds = range(n).filter((id) => !this.faultySet.has(id));
    const digest = hashRequest(request);

    const prePrepareReceivers = primaryFaulty ? [] : honestNodeIds.filter((id) => id !== primaryId);
    const prepareSenders = primaryFaulty ? [] : honestNodeIds;
    const commitSenders = prepareSenders.length >= 2 * f + 1 ? honestNodeIds : [];

    const preparedHonestNodes = prepareSenders.length >= 2 * f + 1 ? honestNodeIds.length : 0;
    const committedHonestNodes = commitSenders.length >= 2 * f + 1 ? honestNodeIds.length : 0;
    const consensusReached = n >= 3 * f + 1 && committedHonestNodes >= 2 * f + 1;

    const phases: PBFTPhaseMetrics[] = [
      {
        phase: 'pre-prepare',
        messageCount: prePrepareReceivers.length,
        latencyMs: this.phaseLatency(1, digest),
      },
      {
        phase: 'prepare',
        messageCount: prepareSenders.length * Math.max(0, n - 1),
        latencyMs: prepareSenders.length === 0 ? 0 : this.phaseLatency(2, digest),
      },
      {
        phase: 'commit',
        messageCount: commitSenders.length * Math.max(0, n - 1),
        latencyMs: commitSenders.length === 0 ? 0 : this.phaseLatency(3, digest),
      },
    ];

    const totalMessages = phases.reduce((sum, phase) => sum + phase.messageCount, 0);
    const totalLatencyMs = phases.reduce((sum, phase) => sum + phase.latencyMs, 0);

    return {
      requestId: request.requestId,
      nodeCount: n,
      faultTolerance: f,
      faultyNodeIds: [...this.config.faultyNodeIds],
      primaryId,
      preparedHonestNodes,
      committedHonestNodes,
      consensusReached,
      totalMessages,
      totalLatencyMs,
      phases,
      explanation: consensusReached
        ? `Consensus reached: ${committedHonestNodes} honest nodes committed digest ${digest.slice(0, 12)} with threshold ${2 * f + 1}.`
        : `Consensus failed: committed honest nodes=${committedHonestNodes}, threshold=${2 * f + 1}.`,
    };
  }

  private phaseLatency(phaseNo: number, digest: string): number {
    const seed = Number.parseInt(digest.slice(phaseNo * 4, phaseNo * 4 + 4), 16);
    const jitter = this.config.jitterMs <= 0 ? 0 : seed % this.config.jitterMs;
    return this.config.baseDelayMs + jitter;
  }
}

export function hashRequest(request: PBFTRequest): string {
  return createHash('sha256')
    .update(`${request.requestId}|${request.clientId}|${request.payload}|${request.timestamp}`)
    .digest('hex');
}

function range(size: number): number[] {
  return Array.from({ length: size }, (_, index) => index);
}
