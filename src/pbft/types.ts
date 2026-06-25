export type PBFTNodeId = number;

export type PBFTRequest = {
  requestId: string;
  clientId: string;
  payload: string;
  timestamp: number;
};

export type PBFTConfig = {
  nodeCount: number;
  faultyNodeIds: PBFTNodeId[];
  view: number;
  baseDelayMs: number;
  jitterMs: number;
};

export type PBFTPhaseMetrics = {
  phase: 'pre-prepare' | 'prepare' | 'commit';
  messageCount: number;
  latencyMs: number;
};

export type PBFTSimulationResult = {
  requestId: string;
  nodeCount: number;
  faultTolerance: number;
  faultyNodeIds: PBFTNodeId[];
  primaryId: PBFTNodeId;
  preparedHonestNodes: number;
  committedHonestNodes: number;
  consensusReached: boolean;
  totalMessages: number;
  totalLatencyMs: number;
  phases: PBFTPhaseMetrics[];
  explanation: string;
};
