import { DatabaseClosedError } from '@/db/database';
import { errorResponse } from './responses';

/**
 * Envolve uma rota que pode estar em voo quando a raiz do AI-DLC muda. O banco do `runtime` antigo
 * fecha depois de uma folga; se a rota ainda o usar, a resposta é 503 com uma mensagem clara, e a
 * pessoa vê o erro em vez de perder uma escrita sem aviso.
 */
export function guardRuntimeChange<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof DatabaseClosedError) {
        return errorResponse(503, 'runtime_changed', 'A raiz mudou. Tente de novo.');
      }
      throw error;
    }
  };
}
