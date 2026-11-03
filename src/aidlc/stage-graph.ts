import { readFileSync } from 'node:fs';
import { z } from 'zod';

export type GraphStage = { slug: string; number: string; phase: string; leadAgent: string };

const graphSchema = z.array(
  z
    .object({
      slug: z.string(),
      number: z.string(),
      phase: z.string(),
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
  return graphSchema.parse(JSON.parse(readFileSync(graphPath, 'utf8')));
}
