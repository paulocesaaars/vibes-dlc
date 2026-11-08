import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logger as defaultLogger, type Logger } from '@/config/logger';
import type { CustomizationItemRepo, CustomizationRow } from '@/db/customization-item-repo';
import {
  type ColorMap,
  type ContrastWarning,
  contrastWarnings,
  type DerivedColors,
  deriveColors,
  isColorKey,
  ORIGINAL_COLORS,
  validateColor,
} from './colors';
import { extensionOf, isMediaContentType, MAX_MEDIA_BYTES, type MediaType } from './media-type';
import { SAY_LIMITS, type SayField } from './tokens';

export type ErrorCode =
  'invalid_value' | 'unsupported_type' | 'too_large' | 'stale_visit' | 'no_storage' | 'save_failed';

const STATUS: Record<ErrorCode, number> = {
  invalid_value: 422,
  unsupported_type: 415,
  too_large: 413,
  stale_visit: 409,
  no_storage: 409,
  save_failed: 500,
};

export class CustomizationError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CustomizationError';
    this.status = STATUS[code];
  }
}

export type MediaView = {
  mediaId: string;
  url: string;
  contentType: MediaType['contentType'];
  sizeBytes: number;
};

export type CustomizationState = {
  visitId: string | null;
  colors: { original: ColorMap; custom: Partial<ColorMap>; effective: ColorMap };
  derived: DerivedColors;
  warnings: ContrastWarning[];
  says: Record<string, Partial<Record<SayField, string>>>;
  media: Record<string, MediaView>;
};

export type CustomizationPatch = {
  colors?: Partial<Record<string, string | null>>;
  says?: Record<string, Partial<Record<SayField, string | null>>>;
  media?: Record<string, null>;
  resetAll?: boolean;
};

type Visit = {
  visitId: string;
  snapshot: CustomizationRow[];
  createdMediaIds: string[];
  replacedMediaIds: string[];
};

/** Visita aberta e fila de gravação: ficam na memória do servidor (`reliability-design.md`). */
export type CustomizationRuntimeState = { visit: Visit | null; queue: Promise<unknown> };

export function createCustomizationState(): CustomizationRuntimeState {
  return { visit: null, queue: Promise.resolve() };
}

const STATE_KEY = Symbol.for('vibes-dlc.customization');

export function sharedCustomizationState(): CustomizationRuntimeState {
  const holder = globalThis as { [STATE_KEY]?: CustomizationRuntimeState };
  holder[STATE_KEY] ??= createCustomizationState();
  return holder[STATE_KEY];
}

/** Operações de disco, injetáveis para os testes simularem disco cheio. */
export type MediaFiles = {
  mkdir: (dir: string) => Promise<unknown>;
  writeFile: (file: string, bytes: Uint8Array) => Promise<unknown>;
  rename: (from: string, to: string) => Promise<unknown>;
  rm: (file: string) => Promise<unknown>;
  readdir: (dir: string) => Promise<string[]>;
};

export const nodeMediaFiles: MediaFiles = {
  mkdir: (dir) => mkdir(dir, { recursive: true }),
  writeFile: (file, bytes) => writeFile(file, bytes),
  rename: (from, to) => rename(from, to),
  rm: (file) => rm(file, { force: true }),
  readdir: (dir) => readdir(dir),
};

type Dependencies = {
  repo: CustomizationItemRepo;
  /** `null` sem raiz do AI-DLC: não há onde guardar imagem, e o envio é recusado (NFR7.3). */
  mediaDir: string | null;
  files?: MediaFiles;
  now?: () => Date;
  logger?: Logger;
  state?: CustomizationRuntimeState;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[a-z0-9]+$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

type StoredMedia = {
  mediaId: string;
  contentType: MediaType['contentType'];
  sizeBytes: number;
};

function parseMedia(value: string): StoredMedia | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const { mediaId, contentType, sizeBytes } = parsed;
    if (typeof mediaId !== 'string' || !isUuid(mediaId)) return null;
    if (!isMediaContentType(contentType)) return null;
    if (typeof sizeBytes !== 'number') return null;
    return { mediaId, contentType, sizeBytes };
  } catch {
    return null;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class CustomizationService {
  private readonly repo: CustomizationItemRepo;
  private readonly mediaDir: string | null;
  private readonly files: MediaFiles;
  private readonly now: () => Date;
  private readonly log: Logger;
  private readonly state: CustomizationRuntimeState;

  constructor(deps: Dependencies) {
    this.repo = deps.repo;
    this.mediaDir = deps.mediaDir;
    this.files = deps.files ?? nodeMediaFiles;
    this.now = deps.now ?? (() => new Date());
    this.log = deps.logger ?? defaultLogger;
    this.state = deps.state ?? sharedCustomizationState();
  }

  /** Lê as linhas e monta a personalização atual. Não abre nenhum arquivo de mídia. */
  read(): CustomizationState {
    return this.build(this.repo.all());
  }

  /** Localiza a mídia pelo identificador salvo nas preferências. */
  mediaFile(
    mediaId: string,
  ): { filePath: string; contentType: MediaType['contentType']; sizeBytes: number } | null {
    const mediaDir = this.mediaDir;
    if (!mediaDir || !isUuid(mediaId)) return null;
    for (const row of this.repo.all()) {
      if (row.kind !== 'media') continue;
      const media = parseMedia(row.value);
      if (media?.mediaId.toLowerCase() === mediaId.toLowerCase()) {
        return {
          // Mídia do perfil do usuário: existe somente em execução, fora do pacote do servidor.
          filePath: path.join(
            /* turbopackIgnore: true */ mediaDir,
            `${media.mediaId}.${extensionOf(media.contentType)}`,
          ),
          contentType: media.contentType,
          sizeBytes: media.sizeBytes,
        };
      }
    }
    return null;
  }

  openVisit(): Promise<{ visitId: string; state: CustomizationState }> {
    return this.enqueue(async () => {
      const previous = this.state.visit;
      const rows = this.repo.all();
      if (previous) await this.removeUnused(previous.replacedMediaIds, rows);
      const visit: Visit = {
        visitId: randomUUID(),
        snapshot: rows,
        createdMediaIds: [],
        replacedMediaIds: [],
      };
      this.state.visit = visit;
      return { visitId: visit.visitId, state: this.build(rows) };
    });
  }

  put(visitId: string, patch: CustomizationPatch): Promise<CustomizationState> {
    return this.enqueue(async () => {
      const visit = this.requireVisit(visitId);
      const rows = this.repo.all();
      const next = new Map(rows.map((row) => [row.itemKey, row]));
      const replaced: string[] = [];
      this.applyPatch(next, patch, replaced);
      try {
        this.repo.replaceAll([...next.values()]);
      } catch (error) {
        this.saveFailed('put', 'preferences.db', error);
      }
      visit.replacedMediaIds.push(...replaced);
      return this.read();
    });
  }

  /** Recebe bytes já lidos e validados: grava o temporário, renomeia e troca a linha (BR5.1). */
  saveMedia(
    visitId: string,
    momentKey: string,
    bytes: Uint8Array,
    type: MediaType,
  ): Promise<CustomizationState> {
    return this.enqueue(async () => {
      const visit = this.requireVisit(visitId);
      const mediaDir = this.mediaDir;
      if (!mediaDir) {
        this.log.warn('personalização', 'no_storage operação=media');
        throw new CustomizationError(
          'no_storage',
          'O armazenamento local de mídia não está disponível.',
        );
      }
      if (bytes.length < 1) {
        throw new CustomizationError('unsupported_type', 'O arquivo está vazio.');
      }
      if (bytes.length > MAX_MEDIA_BYTES) {
        throw new CustomizationError('too_large', 'O arquivo passa de 25 MB.');
      }
      const mediaId = randomUUID();
      const temporary = path.join(mediaDir, `${mediaId}.tmp`);
      const finalPath = path.join(
        /* turbopackIgnore: true */ mediaDir,
        `${mediaId}.${type.extension}`,
      );
      const shown = `media/${mediaId}.${type.extension}`;
      try {
        await this.files.mkdir(mediaDir);
        await this.files.writeFile(temporary, bytes);
        await this.files.rename(temporary, finalPath);
      } catch (error) {
        await this.quietRemove(temporary);
        await this.quietRemove(finalPath);
        this.saveFailed('media', shown, error);
      }
      const key = `media.${momentKey}`;
      let previous: StoredMedia | null = null;
      try {
        const existing = this.repo.all().find((row) => row.itemKey === key);
        previous = existing ? parseMedia(existing.value) : null;
        const stored: StoredMedia = {
          mediaId,
          contentType: type.contentType,
          sizeBytes: bytes.length,
        };
        this.repo.upsert({
          itemKey: key,
          kind: 'media',
          value: JSON.stringify(stored),
          updatedAt: this.now().toISOString(),
        });
      } catch (error) {
        await this.quietRemove(finalPath);
        this.saveFailed('media', shown, error);
      }
      visit.createdMediaIds.push(mediaId);
      if (previous) visit.replacedMediaIds.push(previous.mediaId);
      return this.read();
    });
  }

  /** Concluir mantém tudo e apaga o que ficou sem uso (BR4.3). */
  done(visitId: string): Promise<CustomizationState> {
    return this.enqueue(async () => {
      const visit = this.requireVisit(visitId);
      const rows = this.repo.all();
      await this.removeUnused([...visit.replacedMediaIds, ...visit.createdMediaIds], rows);
      this.state.visit = null;
      return this.build(rows);
    });
  }

  /** Cancelar regrava o retrato em uma transação e só então apaga os arquivos novos (BR4.3). */
  cancel(visitId: string): Promise<CustomizationState> {
    return this.enqueue(async () => {
      const visit = this.requireVisit(visitId);
      try {
        this.repo.replaceAll(visit.snapshot);
      } catch (error) {
        this.saveFailed('cancel', 'preferences.db', error);
      }
      const rows = this.repo.all();
      await this.removeUnused(visit.createdMediaIds, rows);
      this.state.visit = null;
      return this.build(rows);
    });
  }

  /** Varredura do início: apaga mídia sem linha e todo temporário (BR4.5). */
  sweep(): Promise<{ removed: number; aborted: boolean }> {
    return this.enqueue(async () => {
      const mediaDir = this.mediaDir;
      if (!mediaDir) return { removed: 0, aborted: false };
      let used: Set<string>;
      try {
        used = new Set(this.usedMediaIds(this.repo.all()));
      } catch (error) {
        this.log.warn('personalização', `media_sweep_aborted motivo=${describe(error)}`);
        return { removed: 0, aborted: true };
      }
      let names: string[];
      try {
        names = await this.files.readdir(mediaDir);
      } catch {
        return { removed: 0, aborted: false };
      }
      let removed = 0;
      for (const name of names) {
        const match = MEDIA_FILE.exec(name);
        const orphan =
          name.endsWith('.tmp') ||
          (match !== null && !used.has((match[1] as string).toLowerCase()));
        if (!orphan) continue;
        try {
          await this.files.rm(path.join(mediaDir, name));
          removed++;
        } catch (error) {
          this.log.error('personalização', `read_failed caminho=media motivo=${describe(error)}`);
        }
      }
      if (removed > 0) this.log.info('personalização', `media_sweep_removed quantidade=${removed}`);
      return { removed, aborted: false };
    });
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.state.queue.then(work, work);
    this.state.queue = run.catch(() => undefined);
    return run;
  }

  /** Primeiro passo de toda operação na fila (`reliability-design.md`). */
  private requireVisit(visitId: string): Visit {
    const visit = this.state.visit;
    if (!visit || visit.visitId !== visitId) {
      this.log.warn('personalização', 'stale_visit');
      throw new CustomizationError(
        'stale_visit',
        'Esta tela ficou desatualizada. Reabra a personalização para continuar.',
      );
    }
    return visit;
  }

  private saveFailed(operation: string, shownPath: string, error: unknown): never {
    this.log.error(
      'personalização',
      `save_failed operação=${operation} caminho=${shownPath} motivo=${describe(error)}`,
    );
    throw new CustomizationError(
      'save_failed',
      'Não foi possível salvar. A personalização anterior continua valendo.',
    );
  }

  private usedMediaIds(rows: CustomizationRow[]): string[] {
    return rows
      .filter((row) => row.kind === 'media')
      .flatMap((row) => {
        const media = parseMedia(row.value);
        return media ? [media.mediaId.toLowerCase()] : [];
      });
  }

  private async quietRemove(file: string): Promise<void> {
    try {
      await this.files.rm(file);
    } catch (error) {
      this.log.error('personalização', `read_failed caminho=media motivo=${describe(error)}`);
    }
  }

  /** Apaga os arquivos listados que nenhuma linha usa. Uma falha vira órfão para a próxima varredura. */
  private async removeUnused(mediaIds: string[], rows: CustomizationRow[]): Promise<void> {
    const mediaDir = this.mediaDir;
    if (!mediaDir) return;
    const used = new Set(this.usedMediaIds(rows));
    for (const mediaId of new Set(mediaIds)) {
      if (used.has(mediaId.toLowerCase())) continue;
      for (const extension of ['png', 'jpg', 'gif', 'webp', 'mp4', 'webm']) {
        await this.quietRemove(
          path.join(/* turbopackIgnore: true */ mediaDir, `${mediaId}.${extension}`),
        );
      }
    }
  }

  private build(rows: CustomizationRow[]): CustomizationState {
    const custom: Partial<ColorMap> = {};
    const says: CustomizationState['says'] = {};
    const media: CustomizationState['media'] = {};
    for (const row of rows) {
      const [group, first, second] = row.itemKey.split('.');
      if (row.kind === 'color' && group === 'color' && first && isColorKey(first)) {
        const valid = validateColor(row.value);
        if (valid) custom[first] = valid;
      } else if (
        row.kind === 'say' &&
        group === 'say' &&
        first &&
        (second === 'title' || second === 'text')
      ) {
        (says[first] ??= {})[second] = row.value;
      } else if (row.kind === 'media' && group === 'media' && first) {
        const stored = parseMedia(row.value);
        if (stored) {
          media[first] = {
            mediaId: stored.mediaId,
            url: `/api/customization/media/${stored.mediaId}`,
            contentType: stored.contentType,
            sizeBytes: stored.sizeBytes,
          };
        }
      }
    }
    const effective: ColorMap = { ...ORIGINAL_COLORS, ...custom };
    return {
      visitId: this.state.visit?.visitId ?? null,
      colors: { original: { ...ORIGINAL_COLORS }, custom, effective },
      derived: deriveColors(effective),
      warnings: contrastWarnings(effective),
      says,
      media,
    };
  }

  private applyPatch(
    next: Map<string, CustomizationRow>,
    patch: CustomizationPatch,
    replaced: string[],
  ): void {
    const updatedAt = this.now().toISOString();
    const set = (itemKey: string, kind: string, value: string) =>
      next.set(itemKey, { itemKey, kind, value, updatedAt });

    if (patch.resetAll) {
      if (patch.colors || patch.says || patch.media) {
        throw new CustomizationError('invalid_value', 'Restaurar tudo não aceita outras mudanças.');
      }
      for (const [itemKey, row] of [...next]) {
        if (row.kind === 'media') {
          const media = parseMedia(row.value);
          if (media) replaced.push(media.mediaId);
        }
        next.delete(itemKey);
      }
      return;
    }

    for (const [key, value] of Object.entries(patch.colors ?? {})) {
      if (!isColorKey(key)) {
        throw new CustomizationError('invalid_value', `A cor "${key}" não existe.`);
      }
      if (value === null || value === undefined) {
        next.delete(`color.${key}`);
        continue;
      }
      const valid = validateColor(value);
      if (!valid) {
        throw new CustomizationError('invalid_value', 'Use uma cor no formato #rrggbb.');
      }
      set(`color.${key}`, 'color', valid);
    }

    for (const [momentKey, fields] of Object.entries(patch.says ?? {})) {
      for (const [field, raw] of Object.entries(fields)) {
        if (field !== 'title' && field !== 'text') {
          throw new CustomizationError('invalid_value', `O campo "${field}" não existe.`);
        }
        const itemKey = `say.${momentKey}.${field}`;
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (value === '') {
          next.delete(itemKey);
          continue;
        }
        const limit = SAY_LIMITS[field];
        if (value.length > limit) {
          throw new CustomizationError(
            'invalid_value',
            `O ${field === 'title' ? 'título' : 'texto'} passa de ${limit} caracteres.`,
          );
        }
        set(itemKey, 'say', value);
      }
    }

    for (const momentKey of Object.keys(patch.media ?? {})) {
      const itemKey = `media.${momentKey}`;
      const row = next.get(itemKey);
      const media = row ? parseMedia(row.value) : null;
      if (media) replaced.push(media.mediaId);
      next.delete(itemKey);
    }
  }
}
