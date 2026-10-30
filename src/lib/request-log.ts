import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { log } from "./log";

// The access log: one line per request, written when Next.js ends its root
// span, so it carries the request's trace id, its route and its duration.

const IGNORED = /^\/(_next\/|favicon\.ico)/;

export class RequestLogProcessor implements SpanProcessor {
  onStart(_span: Span, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    if (span.parentSpanContext) return;
    const a = span.attributes;
    const method = a["http.method"];
    const target = a["http.target"];
    if (typeof method !== "string" || typeof target !== "string" || IGNORED.test(target)) return;

    const status = Number(a["http.status_code"] ?? 0);
    const route = a["next.route"] ?? a["http.route"];
    const ms = Math.round(span.duration[0] * 1e3 + span.duration[1] / 1e6);
    const pathname = target.split("?", 1)[0];
    const message = `${method} ${pathname} responded ${status} in ${ms} ms`;
    const fields = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      "http.request.method": method,
      "url.path": pathname,
      "http.response.status_code": status,
      "event.duration": ms * 1e6, // ECS: nanoseconds
      ...(typeof route === "string" ? { "http.route": route } : {}),
    };
    if (status >= 500) log.error("request", message, fields);
    else log.info("request", message, fields);
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
