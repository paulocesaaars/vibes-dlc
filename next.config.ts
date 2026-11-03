import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // node-pty é um módulo nativo: precisa ficar fora do empacotamento do servidor.
  serverExternalPackages: ['node-pty'],
  // A compressão acumularia a saída do terminal no SSE e não faz sentido em um app local.
  compress: false,
  poweredByHeader: false,
  // O `next dev` gravaria um AGENTS.md no repositório da pessoa, e o produto só escreve em `.vibes/`.
  agentRules: false,
};

export default nextConfig;
