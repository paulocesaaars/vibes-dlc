import { stat } from 'node:fs/promises';
import { isUuid } from '@/customization/customization-service';
import { customizationFailure } from '@/web/customization-http';
import { mediaHeaders, parseRange, streamFile } from '@/web/media-serve';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

const NOT_FOUND = 'Esta mídia não existe mais.';

/** Serve a mídia só por `mediaId` em formato de UUID, com Range para vídeo (BR1.4). */
export async function GET(
  request: Request,
  context: { params: Promise<{ mediaId: string }> },
): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const { mediaId } = await context.params;
  if (!isUuid(mediaId)) return errorResponse(404, 'not_found', NOT_FOUND);

  let media: ReturnType<typeof runtime.customization.mediaFile>;
  try {
    media = runtime.customization.mediaFile(mediaId);
  } catch (error) {
    return customizationFailure(error);
  }
  if (!media) return errorResponse(404, 'not_found', NOT_FOUND);

  let size: number;
  try {
    size = (await stat(media.filePath)).size;
  } catch {
    // Arquivo apagado à mão: a interface cai na arte original e nada é gravado no banco (BR4.5).
    return errorResponse(404, 'not_found', NOT_FOUND);
  }
  const headers = mediaHeaders(media.contentType);
  const range = parseRange(request.headers.get('range'), size);
  if (range === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: { ...headers, 'Content-Range': `bytes */${size}` },
    });
  }
  if (range) {
    return new Response(streamFile(media.filePath, range), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(range.end - range.start + 1),
      },
    });
  }
  return new Response(streamFile(media.filePath), {
    status: 200,
    headers: { ...headers, 'Content-Length': String(size) },
  });
}
