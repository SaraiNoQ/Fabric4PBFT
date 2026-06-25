import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PBFTSimulator } from './simulator.js';
import type { PBFTConfig, PBFTRequest } from './types.js';

const nodeCount = intEnv('PBFT_NODES', 4);
const faultyNodeIds = parseFaultyNodes(process.env.PBFT_FAULTY ?? '');
const request: PBFTRequest = {
  requestId: process.env.PBFT_REQUEST_ID ?? `req_${Date.now()}`,
  clientId: process.env.PBFT_CLIENT_ID ?? 'client_001',
  payload: process.env.PBFT_PAYLOAD ?? 'audit transaction digest',
  timestamp: Date.now(),
};

const config: PBFTConfig = {
  nodeCount,
  faultyNodeIds,
  view: intEnv('PBFT_VIEW', 0),
  baseDelayMs: intEnv('PBFT_BASE_DELAY_MS', 20),
  jitterMs: intEnv('PBFT_JITTER_MS', 10),
};

const simulator = new PBFTSimulator(config);
const result = simulator.run(request);
const resultDir = path.join(process.cwd(), 'results');
await mkdir(resultDir, { recursive: true });
await writeFile(path.join(resultDir, 'pbft-demo.json'), JSON.stringify(result, null, 2), 'utf8');

console.log('\nPBFT teaching simulation');
console.log('========================');
console.log(`nodes: ${result.nodeCount}`);
console.log(`f: ${result.faultTolerance}`);
console.log(`faulty nodes: ${result.faultyNodeIds.length === 0 ? 'none' : result.faultyNodeIds.join(',')}`);
console.log(`primary: ${result.primaryId}`);
console.log(`consensus: ${result.consensusReached}`);
console.log(`messages: ${result.totalMessages}`);
console.log(`latency(ms): ${result.totalLatencyMs}`);
console.log(result.explanation);
console.log('\nPhase breakdown:');
for (const phase of result.phases) {
  console.log(`- ${phase.phase}: messages=${phase.messageCount}, latency=${phase.latencyMs}ms`);
}
console.log('\nSaved to results/pbft-demo.json');

function parseFaultyNodes(raw: string): number[] {
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter(Number.isInteger);
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}
