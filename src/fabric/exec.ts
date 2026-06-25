import { spawn } from 'node:child_process';

export type CommandResult = {
  command: string;
  cwd?: string;
  code: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  inheritStdio?: boolean;
  allowFailure?: boolean;
};

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  const started = performance.now();
  const printable = [command, ...args].join(' ');

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: options.inheritStdio ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    if (!options.inheritStdio) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      const result: CommandResult = {
        command: printable,
        cwd: options.cwd,
        code,
        stdout,
        stderr,
        durationMs: performance.now() - started,
      };
      if (code !== 0 && !options.allowFailure) {
        reject(
          new Error(
            [
              `Command failed: ${printable}`,
              `cwd: ${options.cwd ?? process.cwd()}`,
              `exit code: ${code}`,
              stderr.trim(),
              stdout.trim(),
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        );
        return;
      }
      resolve(result);
    });
  });
}
