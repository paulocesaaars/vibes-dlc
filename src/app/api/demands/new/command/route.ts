import { getRuntime } from '@/web/runtime';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput } from '@/web/responses';
import { newDemandCommandSchema, readJsonBody } from '@/web/schemas';
import { sendCommand } from '@/web/send-command';

export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const body = await readJsonBody(request, newDemandCommandSchema);
  if (!body.ok) return invalidInput(body.message);
  if (runtime.customization.readCliKind() !== 'claude_code' || !runtime.config.shell.path)
    return errorResponse(409, 'other_cli', 'O envio exige uma sessão com Git Bash.');
  return sendCommand(runtime, { ...body.data, intentId: '', stageSlug: '' });
}
