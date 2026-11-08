/** Entrada direta do terminal: a sessão identifica o projeto que recebeu as teclas. */
async function terminalPost(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'O terminal não respondeu.');
  }
}
export function postInput(sessionId: string, data: string): Promise<void> {
  return terminalPost('/api/terminal/input', { sessionId, data });
}
export function postResize(sessionId: string, cols: number, rows: number): Promise<void> {
  return terminalPost('/api/terminal/resize', { sessionId, cols, rows });
}
