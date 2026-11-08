import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { isSafeName, resolveAidlcPaths } from './paths';

export type UnitRow = {
  unitName: string;
  description: string;
  status: 'pending' | 'in_progress' | 'built' | 'approved';
  lastStage: string | null;
  skippedStages: string[];
};
export type DecisionRow = {
  kind: 'question' | 'answer' | 'approval' | 'rejection' | 'review';
  stage: string | null;
  at: string;
  text: string;
};

function within(root: string, target: string): boolean {
  return target.startsWith(root + path.sep);
}
type Event = {
  event: string;
  stage: string | null;
  unit: string | null;
  scope: string | null;
  at: string;
  details: string;
};
function parseEvents(text: string): Event[] {
  return text.split(/^---\s*$/m).flatMap((block) => {
    const field = (name: string) =>
      new RegExp(`^\\*\\*${name}\\*\\*:[ \\t]*(.*)$`, 'm').exec(block)?.[1]?.trim() ?? '';
    const event = field('Event');
    const at = field('Timestamp');
    if (!/^[A-Z][A-Z_]*$/.test(event) || Number.isNaN(Date.parse(at))) return [];
    return [
      {
        event,
        at,
        stage: field('Stage') || null,
        unit:
          field('Unit') ||
          (event === 'PLAN_APPROVAL_RECORDED'
            ? /^unit:(.+)$/.exec(field('Plan Target'))?.[1]
            : null) ||
          null,
        scope: field('Gate Scope') || null,
        details:
          field('Details') ||
          field('Question') ||
          field('Answer') ||
          field('Decision') ||
          field('User Input') ||
          field('Verdict') ||
          '',
      },
    ];
  });
}
async function readEvents(recordDir: string, realRecord: string): Promise<Event[]> {
  let names: string[];
  try {
    const auditDir = path.join(recordDir, 'audit');
    if (!within(realRecord, await realpath(auditDir))) return [];
    names = (await readdir(auditDir)).filter((name) => name.endsWith('.md'));
  } catch {
    return [];
  }
  const blocks = await Promise.all(
    names.map(async (name) => {
      try {
        const file = path.join(recordDir, 'audit', name);
        if (!within(realRecord, await realpath(file))) return [];
        return parseEvents(await readFile(file, 'utf8'));
      } catch {
        return [];
      }
    }),
  );
  return blocks.flat().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

async function safeRecord(
  repoRoot: string,
  intentId: string,
): Promise<{ dir: string; real: string } | null> {
  if (!isSafeName(intentId)) return null;
  const intents = resolveAidlcPaths(repoRoot).intentsDir;
  const dir = path.join(intents, intentId);
  try {
    const realRoot = await realpath(intents);
    const real = await realpath(dir);
    return within(realRoot, real) ? { dir, real } : null;
  } catch {
    return null;
  }
}

export async function readUnits(repoRoot: string, intentId: string): Promise<UnitRow[]> {
  const record = await safeRecord(repoRoot, intentId);
  if (!record) return [];
  const recordDir = record.dir;
  let text: string;
  try {
    const file = path.join(recordDir, 'inception', 'units-generation', 'unit-of-work.md');
    if (!within(record.real, await realpath(file))) return [];
    text = await readFile(file, 'utf8');
  } catch {
    return [];
  }
  const units = [...text.matchAll(/^\| U\d+ \| `([^`]+)` \|/gm)].map((match) => match[1]!);
  const events = await readEvents(recordDir, record.real);
  return units.map((unitName) => {
    const related = events.filter((event) => event.unit === unitName);
    const skippedStages = [
      ...new Set(
        related
          .filter((event) => event.event === 'UNIT_SKIPPED')
          .map((event) => event.stage)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    let status: UnitRow['status'] = 'pending';
    let lastStage: string | null = null;
    for (const event of related) {
      lastStage = event.stage ?? lastStage;
      if (
        event.event === 'UNIT_STARTED' ||
        event.event === 'PLAN_APPROVAL_RECORDED' ||
        event.event === 'UNIT_COMPLETED' ||
        event.event === 'UNIT_SKIPPED'
      )
        status = 'in_progress';
      if (event.event === 'UNIT_COMPLETED' && event.stage === 'code-generation') status = 'built';
      if (event.event === 'GATE_APPROVED' && event.scope === 'unit-end') status = 'approved';
      if (event.event === 'GATE_REJECTED') status = 'in_progress';
    }
    const description =
      text.split(`\`${unitName}\``)[1]?.match(/^- \*\*Descrição:\*\* (.+)$/m)?.[1] ?? '';
    return { unitName, description, status, lastStage, skippedStages };
  });
}

export async function readDecisions(repoRoot: string, intentId: string): Promise<DecisionRow[]> {
  const record = await safeRecord(repoRoot, intentId);
  if (!record) return [];
  const recordDir = record.dir;
  const kinds: Record<string, DecisionRow['kind']> = {
    DECISION_RECORDED: 'question',
    QUESTION_ANSWERED: 'answer',
    GATE_APPROVED: 'approval',
    GATE_REJECTED: 'rejection',
    REVIEW_COMPLETED: 'review',
  };
  return (await readEvents(recordDir, record.real))
    .filter((event) => event.event in kinds)
    .slice(-500)
    .reverse()
    .map((event) => ({
      kind: kinds[event.event]!,
      stage: event.stage,
      at: event.at,
      text: event.details,
    }));
}
