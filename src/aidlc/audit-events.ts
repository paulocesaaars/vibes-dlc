import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

export type AuditEvent = {
  event: string;
  timestampMs: number;
  stage: string | null;
  unit: string | null;
  stages: string[];
};

export type UnitPosition = { stage: string; unit: string };
export type GateEvent = 'GATE_APPROVED' | 'GATE_REJECTED';

export type AuditSummary = {
  lastEvent: string | null;
  /** Último evento de gate da tentativa atual de cada etapa. */
  gateOf: (stageSlug: string) => GateEvent | null;
  /** Último evento de Unidade, se ele vier depois do último `STAGE_STARTED` da etapa. */
  unitEventAfterStart: (stageSlug: string) => UnitPosition | null;
};

const PLAN_APPROVAL_EVENT = 'PLAN_APPROVAL_RECORDED';
/** O `UNIT_STARTED` de `code-generation` só é gravado depois da construção; a aprovação do plano vem antes. */
const POSITION_EVENTS = new Set([
  'UNIT_STARTED',
  'UNIT_COMPLETED',
  'UNIT_SKIPPED',
  PLAN_APPROVAL_EVENT,
]);
const GATE_EVENTS = new Set(['GATE_APPROVED', 'GATE_REJECTED']);
const FIELD = /^\*\*(Timestamp|Event|Stage|Stages|Unit|Plan Target)\*\*:[ \t]*(.*)$/;
const SEPARATOR = /^---\s*$/;
const UNIT_PLAN_TARGET = /^unit:(.+)$/;

type RawBlock = Partial<
  Record<'Timestamp' | 'Event' | 'Stage' | 'Stages' | 'Unit' | 'Plan Target', string>
>;

/** A aprovação do plano não tem `Unit`: a Unidade vem de `Plan Target`, quando o alvo é uma Unidade. */
function unitOf(block: RawBlock): string | null {
  const unit = block.Unit?.trim();
  if (unit) return unit;
  if (block.Event !== PLAN_APPROVAL_EVENT) return null;
  return UNIT_PLAN_TARGET.exec(block['Plan Target']?.trim() ?? '')?.[1] ?? null;
}

function toEvent(block: RawBlock): AuditEvent | null {
  const timestampMs = Date.parse(block.Timestamp ?? '');
  if (!block.Event || !/^[A-Z][A-Z_]*$/.test(block.Event) || Number.isNaN(timestampMs)) return null;
  return {
    event: block.Event,
    timestampMs,
    stage: block.Stage?.trim() || null,
    unit: unitOf(block),
    stages: (block.Stages ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
  };
}

/**
 * Lê uma entrada por vez. Uma entrada só vale depois do separador `---`, então a última, ainda
 * sendo gravada, é ignorada e lida de novo na próxima mudança (BR1.3). Campos desconhecidos também.
 */
export class AuditLineParser {
  private block: RawBlock = {};

  constructor(private readonly onEvent: (event: AuditEvent) => void) {}

  push(line: string): void {
    if (SEPARATOR.test(line)) {
      const event = toEvent(this.block);
      if (event) this.onEvent(event);
      this.block = {};
      return;
    }
    // Um título novo sem separador antes deixa a entrada anterior incompleta: ela é descartada.
    if (line.startsWith('## ')) {
      this.block = {};
      return;
    }
    const match = FIELD.exec(line);
    if (!match) return;
    const name = match[1] as keyof RawBlock;
    this.block[name] ??= match[2] as string;
  }
}

export function parseAuditText(text: string): AuditEvent[] {
  const events: AuditEvent[] = [];
  const parser = new AuditLineParser((event) => events.push(event));
  for (const line of text.split(/\r?\n/)) parser.push(line);
  return events;
}

/**
 * Guarda só o que a decisão usa: o último gate de cada tentativa e o último evento de Unidade. Os
 * eventos entram em ordem de data, e um `STAGE_STARTED` zera o gate da etapa (`functional-spec.md`).
 */
export function summarizeEvents(events: AuditEvent[]): AuditSummary {
  const gates = new Map<string, GateEvent>();
  const attemptStart = new Map<string, number>();
  let lastUnit: (UnitPosition & { sequence: number }) | null = null;

  for (const [sequence, entry] of events.entries()) {
    if (entry.event === 'STAGE_STARTED' && entry.stage) {
      attemptStart.set(entry.stage, sequence);
      gates.delete(entry.stage);
    } else if (POSITION_EVENTS.has(entry.event) && entry.stage && entry.unit) {
      lastUnit = { stage: entry.stage, unit: entry.unit, sequence };
    } else if (GATE_EVENTS.has(entry.event) && !entry.unit) {
      // Um gate com `Unit` é checkpoint de Unidade e não aprova a etapa inteira.
      for (const slug of new Set([entry.stage, ...entry.stages])) {
        if (slug) gates.set(slug, entry.event as GateEvent);
      }
    }
  }

  const unitOfRun = lastUnit;
  return {
    lastEvent: events.at(-1)?.event ?? null,
    gateOf: (stageSlug) => gates.get(stageSlug) ?? null,
    unitEventAfterStart: (stageSlug) => {
      const start = attemptStart.get(stageSlug);
      if (start === undefined || !unitOfRun || unitOfRun.sequence <= start) return null;
      return { stage: unitOfRun.stage, unit: unitOfRun.unit };
    },
  };
}

export type AuditFiles = { files: string[]; signature: string; lastModifiedMs: number };

/** Lista os arquivos de `audit/`, um por clone, sem ler o conteúdo. Sem pasta, a lista é vazia. */
export async function listAuditFiles(auditDir: string): Promise<AuditFiles> {
  let names: string[];
  try {
    names = await readdir(auditDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { files: [], signature: 'sem-audit', lastModifiedMs: 0 };
    }
    throw error;
  }
  const files = names
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => path.join(auditDir, name));
  const stats = await Promise.all(files.map((file) => stat(file)));
  return {
    files,
    signature: stats.map((entry) => `${entry.size}:${entry.mtimeMs}`).join('|'),
    lastModifiedMs: stats.reduce((latest, entry) => Math.max(latest, entry.mtimeMs), 0),
  };
}

const KEPT_EVENTS = new Set(['STAGE_STARTED', ...POSITION_EVENTS, ...GATE_EVENTS]);

async function readRelevantEvents(file: string): Promise<AuditEvent[]> {
  const kept: AuditEvent[] = [];
  const tail: { event: AuditEvent | null } = { event: null };
  const parser = new AuditLineParser((event) => {
    if (KEPT_EVENTS.has(event.event)) {
      kept.push(event);
      tail.event = null;
    } else {
      // Dos outros eventos, só o último importa: ele alimenta `lastEvent`.
      tail.event = event;
    }
  });
  const lines = createInterface({
    input: createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) parser.push(line);
  if (tail.event) kept.push(tail.event);
  return kept;
}

/**
 * Lê todos os clones, em fluxo e sem bloquear o processo (NFR1.2), e ordena pela data. A ordem é
 * estável, então eventos no mesmo segundo mantêm a ordem do arquivo. O resto do texto é descartado.
 */
export async function readAuditSummary(files: string[]): Promise<AuditSummary> {
  const perFile = await Promise.all(files.map((file) => readRelevantEvents(file)));
  const merged = perFile.flat().sort((a, b) => a.timestampMs - b.timestampMs);
  return summarizeEvents(merged);
}
