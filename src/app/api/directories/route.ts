import path from 'node:path';
import { homedir } from 'node:os';
import { opendir, realpath, stat } from 'node:fs/promises';
import { getRuntime } from '@/web/runtime';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, jsonResponse } from '@/web/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const rejected = rejectForeignRequest(request, getRuntime().config);
  if (rejected) return rejected;
  const requested = new URL(request.url).searchParams.get('path') || homedir();
  if (!path.isAbsolute(requested) || requested.length > 4096 || requested.includes('\0'))
    return errorResponse(422, 'invalid_path', 'Informe o caminho absoluto de uma pasta.');
  try {
    const current = await realpath(requested);
    if (!(await stat(current)).isDirectory())
      return errorResponse(422, 'not_directory', 'O caminho não é uma pasta.');
    const folders: { name: string; path: string }[] = [];
    let scanned = 0;
    let truncated = false;
    for await (const entry of await opendir(current)) {
      if (++scanned > 10000 || folders.length >= 1000) {
        truncated = true;
        break;
      }
      if (entry.isDirectory())
        folders.push({ name: entry.name, path: path.join(current, entry.name) });
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
    const parent = path.dirname(current);
    return jsonResponse({
      path: current,
      parent: parent === current ? null : parent,
      home: homedir(),
      folders,
      truncated,
    });
  } catch {
    return errorResponse(
      422,
      'directory_unavailable',
      'Não foi possível acessar a pasta. Confira o caminho e as permissões.',
    );
  }
}
