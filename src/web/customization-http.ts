import { CustomizationError } from '@/customization/customization-service';
import { logger } from '@/config/logger';
import { errorResponse } from './responses';

/** Erros de personalização no formato `{ code, message }` do contrato C4. */
export function customizationFailure(error: unknown): Response {
  if (error instanceof CustomizationError) {
    return errorResponse(error.status, error.code, error.message);
  }
  logger.error(
    'personalização',
    `read_failed caminho=preferences.db motivo=${error instanceof Error ? error.message : String(error)}`,
  );
  return errorResponse(500, 'save_failed', 'Não foi possível concluir. Tente de novo.');
}

export function invalidValue(message: string): Response {
  return errorResponse(422, 'invalid_value', message);
}
