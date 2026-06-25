import { readFile } from 'node:fs/promises';
import path from 'node:path';

const csvPath = process.argv[2] ?? path.join(process.cwd(), 'results', 'fabric-workload.csv');
const input = await readFile(csvPath, 'utf8');
const lines = input.trim().split(/\r?\n/);
const header = lines.shift()?.split(',') ?? [];
const successIndex = header.indexOf('success');
const latencyIndex = header.indexOf('latencyMs');

const rows = lines.filter(Boolean);
const successfulLatencies = rows
  .map((line) => line.split(','))
  .filter((cells) => clean(cells[successIndex]) === 'true')
  .map((cells) => Number(clean(cells[latencyIndex])))
  .filter(Number.isFinite)
  .sort((a, b) => a - b);

const report = {
  input: csvPath,
  total: rows.length,
  success: successfulLatencies.length,
  failed: rows.length - successfulLatencies.length,
  successRate: rows.length === 0 ? 0 : successfulLatencies.length / rows.length,
  avgLatencyMs: average(successfulLatencies),
  p50LatencyMs: percentile(successfulLatencies, 0.5),
  p95LatencyMs: percentile(successfulLatencies, 0.95),
  p99LatencyMs: percentile(successfulLatencies, 0.99),
  minLatencyMs: successfulLatencies[0] ?? null,
  maxLatencyMs: successfulLatencies.at(-1) ?? null,
};

console.log(JSON.stringify(report, null, 2));

function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/^"|"$/g, '');
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const index = Math.ceil(values.length * p) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}
