import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { LogLevel } from '@/config/logger';
import { Logger } from '@/config/logger';
import {
  createCustomizationState,
  CustomizationService,
  type MediaFiles,
  nodeMediaFiles,
} from '@/customization/customization-service';
import { CustomizationItemRepo } from '@/db/customization-item-repo';
import { prepareStorage } from '@/db/storage';
import { tempDir } from '../u1/helpers';

/** Bytes mínimos com a assinatura de cada tipo, preenchidos até o tamanho pedido. */
export function mediaBytes(kind: string, size = 64): Uint8Array {
  const heads: Record<string, number[]> = {
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    gif: [...Buffer.from('GIF89a')],
    webp: [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')],
    mp4: [0, 0, 0, 0x18, ...Buffer.from('ftypisom')],
    webm: [0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, ...Buffer.from('webm')],
  };
  const head = heads[kind] as number[];
  const bytes = new Uint8Array(Math.max(size, head.length));
  bytes.set(head);
  return bytes;
}

export type ServiceKit = {
  service: CustomizationService;
  repo: CustomizationItemRepo;
  mediaDir: string;
  logs: { level: LogLevel; line: string }[];
  close: () => void;
};

/** Serviço real com banco e pasta de mídia temporários; `files` troca só o disco. */
export function createService(overrides: { files?: Partial<MediaFiles> } = {}): ServiceKit {
  const root = tempDir();
  const db = prepareStorage(path.join(root, '.vibes', 'vibes.db'));
  const repo = new CustomizationItemRepo(db);
  const mediaDir = path.join(root, '.vibes', 'media');
  const logs: ServiceKit['logs'] = [];
  const service = new CustomizationService({
    repo,
    mediaDir,
    files: { ...nodeMediaFiles, ...overrides.files },
    logger: new Logger((level, line) => logs.push({ level, line })),
    state: createCustomizationState(),
  });
  return { service, repo, mediaDir, logs, close: () => db.close() };
}

export function mediaFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}
