import { randomUUID } from 'node:crypto';
import { getRuntime } from '@/web/runtime';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { noteSchema, readJsonBody, readQuery } from '@/web/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ intentId: string }> };
export async function GET(request: Request, context: Context): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const { intentId } = await context.params;
  const query = readQuery(request, z.object({ path: z.string().min(1).max(1024) }));
  if (!query) return invalidInput();
  if (!(await runtime.reader.readArtifact(intentId, query.path)))
    return errorResponse(404, 'not_found', 'Artefato não encontrado.');
  return jsonResponse({ notes: runtime.notes.list(intentId, query.path) });
}
export async function POST(request: Request, context: Context): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const { intentId } = await context.params;
  const body = await readJsonBody(request, noteSchema);
  if (!body.ok) return invalidInput(body.message);
  if (!(await runtime.reader.readArtifact(intentId, body.data.path)))
    return errorResponse(404, 'not_found', 'Artefato não encontrado.');
  const note = {
    noteId: randomUUID(),
    intentId,
    artifactPath: body.data.path,
    text: body.data.text,
    createdAt: new Date().toISOString(),
  };
  runtime.notes.add(note);
  return jsonResponse({ note }, 201);
}
