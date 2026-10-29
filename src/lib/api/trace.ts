import { trace } from "@opentelemetry/api";

/** Header the backend sets on every response; the frontend passes it on to the browser. */
export const TRACE_ID_HEADER = "X-Trace-Id";

/** Trace id of the request being served, when tracing is registered. */
export function currentTraceId(): string | undefined {
  return trace.getActiveSpan()?.spanContext().traceId;
}

/**
 * Trace id to log or return for a backend response: the backend's own header,
 * or the current trace (the same id, since the backend continues our
 * `traceparent`) when the backend didn't answer.
 */
export function traceIdOf(res?: Response): string | undefined {
  return res?.headers.get(TRACE_ID_HEADER) ?? currentTraceId();
}
