import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTALL_FOLDER, INSTALL_LIST } from '../../scripts/install-list';

const README = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');

describe('README de instalação', () => {
  it.each([...INSTALL_LIST])('a lista de cópia traz %s, e o item existe no repositório', (item) => {
    expect(README).toContain(`- \`${item}\``);
    expect(existsSync(path.join(process.cwd(), item))).toBe(true);
  });

  it('o README não lista item nenhum além da constante', () => {
    const section = README.split('Copie para')[1]?.split('Não copie')[0] ?? '';
    const listed = [...section.matchAll(/^ {3}- `([^`]+)`$/gm)].map((match) => match[1]);
    expect(listed).toEqual([...INSTALL_LIST]);
  });

  it('nunca manda copiar aidlc/, .claude/, .vibes/, node_modules/ nem as provas', () => {
    for (const item of INSTALL_LIST) {
      expect(item).not.toMatch(/^(aidlc|\.claude|\.vibes|node_modules|\.next|tests|design)\/?/);
      expect(item).not.toMatch(/proof/);
    }
    expect(README).toMatch(/Não copie `aidlc\/`/);
  });

  it('explica os pré-requisitos, o .gitignore à mão, a atualização e a instalação por cópia', () => {
    expect(README).toContain('Node.js 22.13');
    expect(README).toContain('Git Bash');
    expect(README).toContain('`node-pty`');
    expect(README).toContain('ferramentas de compilação');
    expect(README).toContain('`npm install`');
    expect(README).toContain('`npm run dev`');
    expect(README).toContain('`npm run build && npm start`');
    expect(README).toMatch(/Adicione `\.vibes\/` ao `\.gitignore`.*à mão/);
    expect(README).toContain('**Não apague');
    expect(README).toMatch(/copiando/);
    expect(INSTALL_FOLDER).toBe('vibes-dlc');
  });
});
