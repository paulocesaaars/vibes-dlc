import { readFileSync } from 'node:fs';
import { z } from 'zod';

export type GraphStage = { slug: string; number: string; phase: string; leadAgent: string };

const safeSlug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const graphSchema = z.array(
  z
    .object({
      slug: safeSlug,
      number: z.string(),
      phase: safeSlug,
      lead_agent: z.string().optional(),
    })
    .transform((node) => ({
      slug: node.slug,
      number: node.number,
      phase: node.phase,
      leadAgent: node.lead_agent ?? '',
    })),
);

/** Lê a lista de etapas do framework instalado. Nenhuma contagem fica fixa no código (BR4.3). */
export function readStageGraph(graphPath: string): GraphStage[] {
  let stages: GraphStage[];
  try {
    stages = graphSchema.min(1).parse(JSON.parse(readFileSync(graphPath, 'utf8')));
  } catch {
    throw new Error(
      `O grafo do AI-DLC está ausente, ilegível ou em formato incompatível: ${graphPath}`,
    );
  }
  if (new Set(stages.map((stage) => stage.slug)).size !== stages.length) {
    throw new Error('O grafo do AI-DLC contém etapas duplicadas.');
  }
  return stages;
}
