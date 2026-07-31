// Tiny structured logger (no dependency). Swap for pino in a later milestone if
// you want log shipping.
type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = {debug: 10, info: 20, warn: 30, error: 40};
const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 20;

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (ORDER[level] < threshold) return;
  const line = {t: new Date().toISOString(), level, msg, ...meta};
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(JSON.stringify(line));
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
};
