import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function sourcesOf(pattern: string): { file: string; text: string }[] {
  return globSync(pattern).map((file) => ({ file, text: readFileSync(file, 'utf8') }));
}

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1] as string,
  );
}

describe('limites entre módulos', () => {
  it('core não conhece Next.js, SQLite, terminal nem o sistema de arquivos', () => {
    for (const { file, text } of sourcesOf('src/core/**/*.ts')) {
      for (const imported of importsOf(text)) {
        expect(imported, file).toMatch(/^\.\//);
      }
    }
  });

  it('só db toca o banco', () => {
    for (const { file, text } of sourcesOf('src/**/*.{ts,tsx}')) {
      if (file.split(path.sep).join('/').startsWith('src/db/')) continue;
      expect(importsOf(text), file).not.toContain('node:sqlite');
    }
  });

  it('aidlc não recebe referência ao terminal e só lê arquivos', () => {
    for (const { file, text } of sourcesOf('src/aidlc/**/*.ts')) {
      expect(importsOf(text).join(' '), file).not.toMatch(/terminal|node-pty|@\/db/);
      expect(text, file).not.toMatch(
        /\b(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|rmSync|renameSync|unlinkSync)\b/,
      );
    }
  });

  it('guide é dado estático, sem acesso a arquivos', () => {
    for (const { file, text } of sourcesOf('src/guide/**/*.ts')) {
      expect(importsOf(text).join(' '), file).not.toMatch(/node:|@\/aidlc|@\/db|@\/terminal/);
    }
  });

  it('o terminal usa só a configuração', () => {
    for (const { file, text } of sourcesOf('src/terminal/**/*.ts')) {
      expect(importsOf(text).join(' '), file).not.toMatch(/@\/(aidlc|core|db|guide|web)/);
    }
  });
});

describe('o andamento nunca vem da saída do terminal', () => {
  it('nenhum módulo de decisão lê a janela de saída', () => {
    const deciders = [
      ...sourcesOf('src/core/**/*.ts'),
      ...sourcesOf('src/aidlc/**/*.ts'),
      ...sourcesOf('src/web/guide-service.ts'),
      ...sourcesOf('src/guide/**/*.ts'),
    ];
    for (const { file, text } of deciders) {
      expect(text, file).not.toMatch(/OutputWindow|\.attach\(|\.since\(/);
    }
  });
});

describe('rede e dados', () => {
  it('o produto não aponta para endereços externos', () => {
    // O endereço montado com `${config.host}` é o de escuta do próprio painel.
    const allowed = /127\.0\.0\.1|localhost|^http:\/\/\$\{config\.host\}/;
    for (const { file, text } of sourcesOf('src/**/*.{ts,tsx,css}')) {
      for (const url of text.match(/https?:\/\/[^\s'"`)]+/g) ?? []) {
        expect(url, file).toMatch(allowed);
      }
    }
  });

  it('a interface só chama rotas do próprio app', () => {
    for (const { file, text } of sourcesOf('src/web/client/**/*.ts')) {
      for (const match of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
        expect(match[1], file).toMatch(/^\/api\//);
      }
    }
  });

  it('não há geração de commandId fora do clique de confirmação', () => {
    const callers = sourcesOf('src/**/*.{ts,tsx}').filter(({ text }) =>
      text.includes('newCommandId('),
    );
    const files = callers.map(({ file }) => file.split(path.sep).join('/')).sort();
    expect(files).toEqual(['src/web/client/terminal-io.ts', 'src/web/client/use-guide.ts']);
  });

  it('as fontes vêm do pacote, sem recurso externo', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8');
    expect(layout).toContain('@fontsource/nunito');
    expect(layout).toContain('@fontsource/jetbrains-mono');
    expect(readFileSync('next.config.ts', 'utf8')).not.toMatch(/https?:/);
  });

  it('o next dev não grava arquivos no repositório da pessoa nem envia telemetria', () => {
    expect(readFileSync('next.config.ts', 'utf8')).toMatch(/agentRules:\s*false/);
    expect(readFileSync('src/web/bootstrap.ts', 'utf8')).toContain("NEXT_TELEMETRY_DISABLED: '1'");
  });

  it('nenhum log recebe a saída do terminal nem o texto do comando', () => {
    for (const { file, text } of sourcesOf('src/**/*.ts')) {
      for (const call of text.matchAll(/logger\.\w+\([^;]*;/gs)) {
        expect(call[0], file).not.toMatch(/\bbody\.text\b|\bchunk\b|\.data\b|\btext\b\s*[,)}]/);
      }
    }
  });
});
