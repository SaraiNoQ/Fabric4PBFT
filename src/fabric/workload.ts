import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AuditClient } from './auditClient.js';
import { assertFabricSamples } from './paths.js';

assertFabricSamples();

type WorkloadConfig = {
  rounds: number;
  clientsPerRound: number;
  concurrency: number;
  shardCount: number;
  metadataBytes: number;
};

type WorkloadRow = {
  auditId: string;
  roundId: string;
  clientId: string;
  shardId: string;
  success: boolean;
  latencyMs: number;
  error: string;
};

const config: WorkloadConfig = {
  rounds: intEnv('ROUNDS', 5),
  clientsPerRound: intEnv('CLIENTS_PER_ROUND', 10),
  concurrency: intEnv('CONCURRENCY', 4),
  shardCount: intEnv('SHARD_COUNT', 2),
  metadataBytes: intEnv('METADATA_BYTES', 256),
};

const client = new AuditClient();
const jobs = buildJobs(config);
const rows: WorkloadRow[] = [];
const started = performance.now();

await runPool(jobs, config.concurrency, async (job) => {
  const result = await client.recordAudit(job);
  const row: WorkloadRow = {
    auditId: result.auditId,
    roundId: job.roundId,
    clientId: job.clientId,
    shardId: job.shardId,
    success: result.success,
    latencyMs: Number(result.latencyMs.toFixed(3)),
    error: result.success ? '' : result.stderr || result.stdout,
  };
  rows.push(row);
  console.log(`${row.auditId}\tsuccess=${row.success}\tlatency=${row.latencyMs}ms`);
});

const durationSec = (performance.now() - started) / 1000;
const success = rows.filter((r) => r.success).length;
const resultDir = path.join(process.cwd(), 'results');
await mkdir(resultDir, { recursive: true });
await writeFile(path.join(resultDir, 'fabric-workload.csv'), toCsv(rows), 'utf8');
await writeFile(
  path.join(resultDir, 'fabric-workload-summary.json'),
  JSON.stringify(
    {
      config,
      total: rows.length,
      success,
      failed: rows.length - success,
      successRate: rows.length === 0 ? 0 : success / rows.length,
      durationSec,
      throughputTps: durationSec === 0 ? 0 : success / durationSec,
    },
    null,
    2,
  ),
  'utf8',
);

function buildJobs(config: WorkloadConfig) {
  const jobs = [];
  for (let r = 1; r <= config.rounds; r += 1) {
    for (let c = 1; c <= config.clientsPerRound; c += 1) {
      const clientId = `client_${String(c).padStart(3, '0')}`;
      const shardId = `shard_${c % config.shardCount}`;
      const auditId = `audit_r${r}_c${String(c).padStart(3, '0')}_${Date.now()}`;
      jobs.push({
        auditId,
        roundId: String(r),
        clientId,
        shardId,
        updatePayload: `round=${r};client=${clientId};update=${auditId}`,
        prototypePayload: `round=${r};client=${clientId};prototype=${auditId}`,
        metadata: {
          round: r,
          clientId,
          shardId,
          local_samples: 128 + c,
          local_loss: Number((1 / (r + c)).toFixed(6)),
          local_acc: Number((0.7 + r * 0.01).toFixed(6)),
          padding: 'x'.repeat(Math.max(0, config.metadataBytes)),
        },
      });
    }
  }
  return jobs;
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function toCsv(rows: WorkloadRow[]): string {
  const header = ['auditId', 'roundId', 'clientId', 'shardId', 'success', 'latencyMs', 'error'];
  const lines = rows.map((row) =>
    header
      .map((key) => String(row[key as keyof WorkloadRow]).replaceAll('"', '""'))
      .map((cell) => `"${cell}"`)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}
