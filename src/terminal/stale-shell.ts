import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { logger } from '@/config/logger';

export type CommandRunner = (file: string, args: string[]) => string;

/** O que fica em `.vibes/terminal.pid`: o shell, o servidor dono dele e quando o shell abriu. */
export type ShellRecord = { shellPid: number; ownerPid: number; startedAt: number };

/** Folga entre o horário gravado pelo servidor e o horário de início que o Windows informa. */
const START_TIME_TOLERANCE_MS = 10_000;

const runCommand: CommandRunner = (file, args) =>
  execFileSync(file, args, { encoding: 'utf8', windowsHide: true, stdio: 'pipe' });

function listProcess(pid: number, run: CommandRunner): string {
  return run('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
}

function readProcessStart(pid: number, run: CommandRunner): number {
  const command = `(Get-Process -Id ${pid}).StartTime.ToUniversalTime().ToString('o')`;
  return Date.parse(run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]));
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function isPid(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function parseRecord(content: string): ShellRecord | null {
  try {
    const record = JSON.parse(content) as Partial<ShellRecord>;
    if (isPid(record.shellPid) && isPid(record.ownerPid) && Number.isFinite(record.startedAt)) {
      return record as ShellRecord;
    }
  } catch {
    // Conteúdo ilegível é tratado como registro ausente logo abaixo.
  }
  return null;
}

/**
 * Encerra o processo e seus filhos, sem passar por um shell. O `taskkill /T` pode terminar com erro
 * por um filho que já está saindo, então o que vale é o processo não existir mais.
 */
export function killProcessTree(pid: number, run: CommandRunner = runCommand): void {
  try {
    run('taskkill', ['/PID', String(pid), '/T', '/F']);
  } catch (error) {
    if (listProcess(pid, run).includes(`"${pid}"`)) throw error;
  }
}

/**
 * Se o servidor anterior caiu sem aviso, um `bash.exe` pode continuar vivo no Windows. Este passo
 * só encerra o shell quando três coisas valem juntas: o servidor dono não existe mais, o PID ainda
 * é um `bash.exe` e ele abriu no horário gravado. Assim, um segundo `npm run dev` não derruba a
 * sessão do primeiro, e um PID reaproveitado por outro Git Bash da pessoa fica intacto.
 */
export function killStaleShell(
  pidFile: string,
  run: CommandRunner = runCommand,
  isAlive: (pid: number) => boolean = isProcessAlive,
): boolean {
  if (!existsSync(pidFile)) return false;
  const record = parseRecord(readFileSync(pidFile, 'utf8'));
  if (record && isAlive(record.ownerPid)) return false;
  rmSync(pidFile, { force: true });
  if (!record || process.platform !== 'win32') return false;
  const { shellPid: pid, startedAt } = record;

  try {
    if (!/^"bash\.exe"/im.test(listProcess(pid, run))) return false;
    if (Math.abs(readProcessStart(pid, run) - startedAt) > START_TIME_TOLERANCE_MS) return false;
    killProcessTree(pid, run);
    logger.info('terminal', `Encerrei o shell que sobrou da execução anterior (PID ${pid}).`);
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn('terminal', `Não foi possível conferir o shell anterior (PID ${pid}): ${reason}.`);
    return false;
  }
}
