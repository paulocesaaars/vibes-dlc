'use client';

import { useEffect, useRef, useState } from 'react';

type Directory = {
  path: string;
  parent: string | null;
  home: string;
  folders: { name: string; path: string }[];
  truncated: boolean;
};

export function DirectoryPicker({
  initialPath,
  busy,
  error,
  onSelect,
  onClose,
}: {
  initialPath?: string;
  busy: boolean;
  error: string | null;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState(initialPath || '');
  const [input, setInput] = useState(initialPath || '');
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/directories?' + new URLSearchParams({ path: target }), {
          signal: controller.signal,
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (controller.signal.aborted) return;
        setDirectory(result);
        setInput(result.path);
        setFailure(null);
      } catch (reason) {
        if (!controller.signal.aborted)
          setFailure(
            reason instanceof Error ? reason.message : 'Não foi possível listar as pastas.',
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [target]);
  function navigate(path: string) {
    if (path === target) return;
    setLoading(true);
    setTarget(path);
  }
  return (
    <dialog
      ref={dialog}
      className="directory-dialog card card-pad"
      aria-labelledby="directory-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="directory-title">Selecionar pasta do projeto</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate(input);
        }}
      >
        <label htmlFor="directory-path">Pasta</label>
        <div className="workspace-actions">
          <input
            id="directory-path"
            className="field"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={busy}
          />
          <button className="btn2" disabled={busy || loading}>
            Ir
          </button>
        </div>
      </form>
      <div className="workspace-actions">
        <button
          className="btn2"
          disabled={busy || loading || !directory?.parent}
          onClick={() => navigate(directory!.parent!)}
        >
          Subir um nível
        </button>
        <button
          className="btn2"
          disabled={busy || loading || !directory}
          onClick={() => navigate(directory!.home)}
        >
          Pasta pessoal
        </button>
      </div>
      <div className="directory-folders" aria-busy={loading}>
        {loading ? (
          <p role="status">Carregando pastas…</p>
        ) : (
          directory?.folders.map((folder) => (
            <button
              key={folder.path}
              className="btn2"
              disabled={busy}
              onClick={() => navigate(folder.path)}
            >
              📁 {folder.name}
            </button>
          ))
        )}
        {!loading && directory?.folders.length === 0 ? <p>Nenhuma subpasta.</p> : null}
      </div>
      {directory?.truncated ? (
        <p>Lista limitada. Use o campo acima para acessar outra pasta diretamente.</p>
      ) : null}
      {failure || error ? <p role="alert">{failure || error}</p> : null}
      <div className="workspace-actions">
        <button
          className="cta"
          disabled={busy || loading || !!failure || !directory}
          onClick={() => onSelect(directory!.path)}
        >
          Selecionar esta pasta
        </button>
        <button className="btn2" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </dialog>
  );
}
