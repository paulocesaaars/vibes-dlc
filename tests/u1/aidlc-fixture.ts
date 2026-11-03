import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './helpers';

export const INTENT_ID = '261103-vibes-dlc-mvp';
const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures', 'aidlc');

/** O `aidlc-state.md` real deste intent, copiado para `tests/fixtures`. */
export const REAL_STATE = readFileSync(path.join(FIXTURES, 'aidlc-state.md'), 'utf8');

export type AidlcRepo = { root: string; statePath: string; recordDir: string; intentsDir: string };

/** Monta um repositório temporário com os arquivos reais do AI-DLC. */
export function createAidlcRepo(name = 'repo'): AidlcRepo {
  const root = path.join(tempDir(), name);
  const intentsDir = path.join(root, 'aidlc', 'spaces', 'default', 'intents');
  const recordDir = path.join(intentsDir, INTENT_ID);
  mkdirSync(recordDir, { recursive: true });
  mkdirSync(path.join(root, '.claude', 'tools', 'data'), { recursive: true });
  writeFileSync(path.join(root, 'aidlc', 'active-space'), 'default\n');
  writeFileSync(path.join(intentsDir, 'active-intent'), `${INTENT_ID}\n`);
  const statePath = path.join(recordDir, 'aidlc-state.md');
  writeFileSync(statePath, REAL_STATE);
  copyFileSync(
    path.join(FIXTURES, 'stage-graph.json'),
    path.join(root, '.claude', 'tools', 'data', 'stage-graph.json'),
  );
  return { root, statePath, recordDir, intentsDir };
}

/** Troca a marca de uma etapa no estado. */
export function withMark(state: string, slug: string, mark: string): string {
  return state.replace(new RegExp(`^- \\[.\\] ${slug} `, 'm'), `- [${mark}] ${slug} `);
}
