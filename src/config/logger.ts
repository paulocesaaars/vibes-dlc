export type LogLevel = 'info' | 'warn' | 'error';
export type LogSink = (level: LogLevel, line: string) => void;

const consoleSink: LogSink = (level, line) => {
  console[level](line);
};

/**
 * Registro único do produto: só console, em português (NFR13.3). Recebe só texto montado pelos
 * módulos, sem parâmetro para a saída do terminal nem para o texto de um comando.
 */
export class Logger {
  constructor(private readonly sink: LogSink = consoleSink) {}

  info(area: string, message: string): void {
    this.write('info', area, message);
  }

  warn(area: string, message: string): void {
    this.write('warn', area, message);
  }

  error(area: string, message: string): void {
    this.write('error', area, message);
  }

  private write(level: LogLevel, area: string, message: string): void {
    this.sink(level, `[vibes][${level}][${area}] ${message}`);
  }
}

export const logger = new Logger();
