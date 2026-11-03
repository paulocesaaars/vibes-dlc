import { z } from 'zod';

/** Limites de `security-design.md` (NFR4.5, NFR4.7). */
export const MAX_COMMAND_LENGTH = 8000;
export const MAX_INPUT_BYTES = 64 * 1024;
const MAX_BODY_BYTES = 1024 * 1024;

const uuid = z.uuid();

export const commandSchema = z.object({
  commandId: uuid,
  intentId: z.string().min(1).max(200),
  stageSlug: z.string().max(200),
  text: z
    .string()
    .min(1)
    .max(MAX_COMMAND_LENGTH)
    .refine((text) => !/[\r\n]/.test(text), 'O comando tem uma linha só.')
    .refine(
      // Um caractere de controle não aparece no campo e pode agir na CLI, como executar sem Enter.
      // eslint-disable-next-line no-control-regex
      (text) => !/[\u0000-\u001f\u007f]/.test(text),
      'O comando não pode ter caracteres de controle.',
    )
    .refine((text) => text.trim().length > 0, 'O comando não pode ficar vazio.'),
  mode: z.enum(['execute', 'paste']),
});

export const sessionSchema = z.object({
  sessionId: z.string().min(1).max(200).optional(),
  newSession: z.boolean().optional(),
});

export const inputSchema = z.object({
  sessionId: z.string().min(1).max(200),
  data: z
    .string()
    .min(1)
    .refine((data) => Buffer.byteLength(data) <= MAX_INPUT_BYTES, 'Entrada acima de 64 KB.'),
});

export const resizeSchema = z.object({
  sessionId: z.string().min(1).max(200),
  cols: z.number().int().min(1).max(500),
  rows: z.number().int().min(1).max(200),
});

export const understoodSchema = z.object({ stageSlug: z.string().min(1).max(200) });

/** Mesmo padrão seguro do comando de perguntas, para etapa e Unidade vindas da interface. */
const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(200);
const MAX_PATH_LENGTH = 1024;
const artifactPath = z.string().min(1).max(MAX_PATH_LENGTH);

export const conclusionSchema = z.object({ stageSlug: slug });

export const artifactsQuerySchema = z.object({
  stage: slug,
  unit: slug.optional(),
  path: artifactPath.optional(),
  /** Consulta na trilha: inclui as pastas de todas as Unidades. */
  consult: z.enum(['1']).optional(),
});

export const reviewSchema = z.object({
  path: artifactPath,
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export const seenSchema = z.object({
  stageSlug: slug,
  unit: z.union([slug, z.literal('')]),
  mark: z.enum([
    'pending',
    'in_progress',
    'awaiting_approval',
    'revising',
    'approved',
    'skipped',
    'unknown',
  ]),
});

export type SeenResponse = {
  status: 'first_visit' | 'same' | 'changed';
  current: { stageSlug: string; unit: string; mark: string };
  /** O aviso do que mudou com o painel fechado. Só existe em `changed`. */
  text: string | null;
};

/** Lê os parâmetros da URL, sem aceitar repetidos nem desconhecidos como dado útil. */
export function readQuery<T>(request: Request, schema: z.ZodType<T>): T | null {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(params);
  return parsed.success ? parsed.data : null;
}

export const streamQuerySchema = z.object({
  sessionId: z.string().min(1).max(200),
  afterSeq: z.coerce.number().int().min(0).optional(),
});

/** Lê e valida o JSON do corpo, com um limite de tamanho antes de interpretar. */
export async function readJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, message: 'Não foi possível ler o corpo da requisição.' };
  }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    return { ok: false, message: 'O corpo da requisição é grande demais.' };
  }

  let parsed: unknown;
  try {
    parsed = raw === '' ? {} : JSON.parse(raw);
  } catch {
    return { ok: false, message: 'O corpo da requisição não é um JSON válido.' };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? 'Entrada inválida.' };
  }
  return { ok: true, data: result.data };
}
