import { logger } from '@/config/logger';
import { detectMediaType, MAX_MEDIA_BYTES } from '@/customization/media-type';
import { findMoment } from '@/guide/customizable-moments';
import { customizationFailure, invalidValue } from '@/web/customization-http';
import { acquireUpload, BodyTooLargeError, readLimitedBody } from '@/web/media-upload';
import { parseMultipart } from '@/web/multipart';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

const TOO_LARGE = 'O arquivo passa de 25 MB. Escolha um menor.';

/** Envia uma imagem ou um vídeo para um momento: multipart com `file`, `momentKey` e `visitId`. */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const release = acquireUpload();
  if (!release) {
    logger.warn('personalização', 'upload_busy rota=/api/customization/media');
    return errorResponse(
      429,
      'busy',
      'Já há um envio em andamento. Espere terminar e tente de novo.',
    );
  }
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return invalidValue('O envio precisa ser multipart/form-data.');
    }
    let body: Buffer;
    try {
      body = await readLimitedBody(request);
    } catch (error) {
      if (error instanceof BodyTooLargeError) return errorResponse(413, 'too_large', TOO_LARGE);
      return invalidValue('Não foi possível ler o envio.');
    }
    // O arquivo é uma janela do próprio corpo: sem cópia, o pico fica abaixo de 100 MB (NFR5.5).
    const form = parseMultipart(body, contentType);
    if (!form) return invalidValue('O envio veio em um formato inválido.');
    const momentKey = form.fields.get('momentKey');
    const visitId = form.fields.get('visitId');
    if (!form.file || momentKey === undefined || visitId === undefined) {
      return invalidValue('Faltam campos no envio: file, momentKey e visitId.');
    }
    if (!findMoment(momentKey)) return invalidValue('Esse momento não existe.');
    const bytes = form.file.bytes;
    if (bytes.length > MAX_MEDIA_BYTES) return errorResponse(413, 'too_large', TOO_LARGE);
    if (bytes.length < 1) return errorResponse(415, 'unsupported_type', 'O arquivo está vazio.');

    const type = detectMediaType(bytes);
    if (!type) {
      return errorResponse(
        415,
        'unsupported_type',
        'Use uma imagem PNG, JPEG, GIF ou WebP, ou um vídeo MP4 ou WebM. SVG não é aceito.',
      );
    }
    return jsonResponse(await runtime.customization.saveMedia(visitId, momentKey, bytes, type));
  } catch (error) {
    return customizationFailure(error);
  } finally {
    release();
  }
}
