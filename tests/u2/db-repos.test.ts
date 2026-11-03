import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArtifactReviewRepo } from '@/db/artifact-review-repo';
import type { Database } from '@/db/database';
import { DemandSeenRepo } from '@/db/demand-seen-repo';
import { GuideProgressRepo } from '@/db/guide-progress-repo';
import { prepareStorage } from '@/db/storage';
import { tempDir } from '../u1/helpers';

let db: Database;

beforeEach(() => {
  db = prepareStorage(path.join(tempDir(), 'vibes.db'));
});

afterEach(() => db.close());

describe('ArtifactReviewRepo', () => {
  it('grava e devolve a marca de revisão', () => {
    const repo = new ArtifactReviewRepo(db);
    repo.markReviewed('i', 'ideation/a.md', 'sha-1', '2026-11-03T10:00:00.000Z');
    expect(repo.find('i', 'ideation/a.md')).toEqual({
      intentId: 'i',
      artifactPath: 'ideation/a.md',
      contentHash: 'sha-1',
      reviewedAt: '2026-11-03T10:00:00.000Z',
    });
  });

  it('sem revisão, devolve null', () => {
    expect(new ArtifactReviewRepo(db).find('i', 'nunca.md')).toBeNull();
  });

  it('revisar de novo substitui o hash e a data, sem duplicar', () => {
    const repo = new ArtifactReviewRepo(db);
    repo.markReviewed('i', 'a.md', 'sha-1', 'antes');
    repo.markReviewed('i', 'a.md', 'sha-2', 'depois');
    expect(repo.find('i', 'a.md')).toMatchObject({ contentHash: 'sha-2', reviewedAt: 'depois' });
    expect(db.all('SELECT * FROM artifact_review')).toHaveLength(1);
  });

  it('hashesByPath traz só a demanda pedida', () => {
    const repo = new ArtifactReviewRepo(db);
    repo.markReviewed('i', 'a.md', 'sha-1');
    repo.markReviewed('i', 'b.md', 'sha-2');
    repo.markReviewed('outra', 'c.md', 'sha-3');
    expect([...repo.hashesByPath('i').entries()]).toEqual(
      expect.arrayContaining([
        ['a.md', 'sha-1'],
        ['b.md', 'sha-2'],
      ]),
    );
    expect(repo.hashesByPath('i').size).toBe(2);
    expect(repo.hashesByPath('vazia').size).toBe(0);
  });

  it('valores com aspas e etiquetas ficam como dado, sem virar SQL', () => {
    const repo = new ArtifactReviewRepo(db);
    const hostile = `a'; DROP TABLE artifact_review; --.md`;
    repo.markReviewed('i', hostile, 'sha');
    expect(repo.find('i', hostile)?.artifactPath).toBe(hostile);
  });
});

describe('reconhecimento da conclusão', () => {
  it('sem linha, grava sem marcar Entender', () => {
    const repo = new GuideProgressRepo(db);
    repo.markConclusionSeen('i', 's', 'agora');
    expect(repo.find('i', 's')).toMatchObject({ conclusionSeenAt: 'agora', understoodAt: null });
  });

  it('com linha, mantém o passo e a primeira data', () => {
    const repo = new GuideProgressRepo(db);
    repo.markUnderstood('i', 's', 'antes');
    repo.markConclusionSeen('i', 's', 'primeira');
    repo.markConclusionSeen('i', 's', 'segunda');
    expect(repo.find('i', 's')).toMatchObject({
      currentStep: 'send',
      understoodAt: 'antes',
      conclusionSeenAt: 'primeira',
    });
  });

  it('outra etapa não é reconhecida junto', () => {
    const repo = new GuideProgressRepo(db);
    repo.markConclusionSeen('i', 's');
    expect(repo.find('i', 't')).toBeNull();
    expect(repo.find('outra', 's')).toBeNull();
  });
});

describe('DemandSeenRepo', () => {
  it('sem visita anterior, devolve null', () => {
    expect(new DemandSeenRepo(db).find('i')).toBeNull();
  });

  it('grava e devolve o estado visto', () => {
    const repo = new DemandSeenRepo(db);
    repo.save({ intentId: 'i', stageSlug: 's', unit: 'u2-x', mark: 'in_progress' }, 'agora');
    expect(repo.find('i')).toEqual({
      intentId: 'i',
      stageSlug: 's',
      unit: 'u2-x',
      mark: 'in_progress',
      seenAt: 'agora',
    });
  });

  it('salvar de novo atualiza a mesma linha, inclusive ao sair de uma Unidade', () => {
    const repo = new DemandSeenRepo(db);
    repo.save({ intentId: 'i', stageSlug: 's', unit: 'u2-x', mark: 'in_progress' });
    repo.save({ intentId: 'i', stageSlug: 't', unit: '', mark: 'approved' });
    expect(repo.find('i')).toMatchObject({ stageSlug: 't', unit: '', mark: 'approved' });
    expect(db.all('SELECT * FROM demand_seen_state')).toHaveLength(1);
  });

  it('demandas diferentes têm linhas diferentes', () => {
    const repo = new DemandSeenRepo(db);
    repo.save({ intentId: 'a', stageSlug: 's', unit: '', mark: 'pending' });
    repo.save({ intentId: 'b', stageSlug: 't', unit: '', mark: 'approved' });
    expect(repo.find('a')?.stageSlug).toBe('s');
    expect(repo.find('b')?.stageSlug).toBe('t');
  });
});
