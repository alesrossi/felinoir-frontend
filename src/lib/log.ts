import fs from "node:fs";
import path from "node:path";
import { trace } from "@opentelemetry/api";

// Server-side logger (Node.js runtime only), mirroring the backend's outputs:
// - stdout: readable lines, for `docker logs`;
// - with LOG_FILE_PATH (e.g. /app/logs/felinoir-frontend-.json), also Elastic
//   Common Schema JSON lines in a rolling file, which the server's Alloy ships to
//   Loki. Like the backend's Serilog file sink, the date goes before the
//   extension (felinoir-frontend-20261030.json), files roll daily and at 100 MB,
//   and only the last month, at most 50 files, is kept.

// Serilog's level names, so frontend and backend share Loki's `level` label.
type Level = "Information" | "Warning" | "Error";

const SHORT_LEVEL: Record<Level, string> = { Information: "INF", Warning: "WRN", Error: "ERR" };

export interface LogFields {
  /** Overrides the active span's trace, e.g. for a span that has already ended. */
  traceId?: string;
  spanId?: string;
  error?: unknown;
  /** Extra ECS fields, dotted keys as in ECS: `{ "url.path": "/felix" }`. */
  [field: string]: unknown;
}

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "felinoir-frontend";
const FILE_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;
const RETAINED_FILE_COUNT_LIMIT = 50; // 50 × 100 MB = 5 GB
const RETAINED_FILE_TIME_LIMIT_MS = 31 * 24 * 60 * 60 * 1000;

class RollingFile {
  private readonly dir: string;
  private readonly prefix: string;
  private readonly ext: string;
  private readonly pattern: RegExp;
  private day = "";
  private seq = 0;
  private size = 0;

  constructor(template: string) {
    this.dir = path.dirname(template);
    this.ext = path.extname(template);
    this.prefix = path.basename(template, this.ext);
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    this.pattern = new RegExp(`^${escape(this.prefix)}\\d{8}(_\\d{3})?${escape(this.ext)}$`);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  write(line: string, now: Date): void {
    const day = now.toISOString().slice(0, 10).replaceAll("-", "");
    if (day !== this.day) this.open(day);
    else if (this.size >= FILE_SIZE_LIMIT_BYTES) this.roll();
    fs.appendFileSync(this.file(), line);
    this.size += Buffer.byteLength(line);
  }

  private file(): string {
    const seq = this.seq ? `_${String(this.seq).padStart(3, "0")}` : "";
    return path.join(this.dir, `${this.prefix}${this.day}${seq}${this.ext}`);
  }

  /** Continues today's newest file, as a restarted container must not overwrite it. */
  private open(day: string): void {
    this.day = day;
    this.seq = 0;
    while (fs.existsSync(path.join(this.dir, `${this.prefix}${day}_${String(this.seq + 1).padStart(3, "0")}${this.ext}`))) {
      this.seq++;
    }
    this.size = fs.existsSync(this.file()) ? fs.statSync(this.file()).size : 0;
    if (this.size >= FILE_SIZE_LIMIT_BYTES) this.roll();
    else this.prune();
  }

  private roll(): void {
    this.seq++;
    this.size = 0;
    this.prune();
  }

  private prune(): void {
    const files = fs.readdirSync(this.dir)
      .filter((f) => this.pattern.test(f))
      .map((f) => ({ f, mtime: fs.statSync(path.join(this.dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    const cutoff = Date.now() - RETAINED_FILE_TIME_LIMIT_MS;
    // The file about to be written counts towards the limit.
    files.forEach(({ f, mtime }, i) => {
      if (i >= RETAINED_FILE_COUNT_LIMIT - 1 || mtime < cutoff) fs.rmSync(path.join(this.dir, f), { force: true });
    });
  }
}

let file: RollingFile | null = null;
if (process.env.LOG_FILE_PATH) {
  try {
    file = new RollingFile(process.env.LOG_FILE_PATH);
  } catch (err) {
    console.error(`[log] cannot write ${process.env.LOG_FILE_PATH}, logging to stdout only:`, err);
  }
}

function errorFields(error: unknown): Record<string, string> {
  if (error instanceof Error) {
    return {
      "error.type": error.name,
      "error.message": error.message,
      ...(error.stack ? { "error.stack_trace": error.stack } : {}),
    };
  }
  return error === undefined ? {} : { "error.message": String(error) };
}

function write(level: Level, logger: string, message: string, fields: LogFields = {}): void {
  const { traceId: traceIdField, spanId: spanIdField, error, ...extra } = fields;
  const span = trace.getActiveSpan()?.spanContext();
  const traceId = traceIdField ?? span?.traceId;
  const spanId = spanIdField ?? span?.spanId;
  const now = new Date();

  const text = `[${now.toISOString().slice(0, 19).replace("T", " ")} ${SHORT_LEVEL[level]}] ${logger}: ${message}${traceId ? `  ${traceId}` : ""}`;
  const stack = error instanceof Error ? error.stack : error === undefined ? undefined : String(error);
  (level === "Information" ? console.log : console.error)(stack ? `${text}\n${stack}` : text);

  if (!file) return;
  const record = {
    "@timestamp": now.toISOString(),
    "log.level": level,
    message,
    "ecs.version": "8.11.0",
    "log.logger": logger,
    "service.name": SERVICE_NAME,
    ...(traceId ? { "trace.id": traceId } : {}),
    ...(spanId ? { "span.id": spanId } : {}),
    ...extra,
    ...errorFields(error),
  };
  try {
    file.write(`${JSON.stringify(record)}\n`, now);
  } catch (err) {
    file = null;
    console.error("[log] file logging failed, logging to stdout only:", err);
  }
}

export const log = {
  info: (logger: string, message: string, fields?: LogFields) => write("Information", logger, message, fields),
  warn: (logger: string, message: string, fields?: LogFields) => write("Warning", logger, message, fields),
  error: (logger: string, message: string, fields?: LogFields) => write("Error", logger, message, fields),
};
