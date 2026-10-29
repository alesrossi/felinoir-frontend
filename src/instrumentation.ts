import { registerOTel } from "@vercel/otel";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import type { Context } from "@opentelemetry/api";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

/**
 * Writes `traceparent` on outgoing requests but ignores it on incoming ones.
 * The frontend is the entry point of the architecture, so every trace starts
 * here: a browser or crawler can't pick the trace id the backend logs under.
 */
class OriginTraceContextPropagator extends W3CTraceContextPropagator {
  extract(context: Context): Context {
    return context;
  }
}

// Next.js opens a root span per request; fetches to the backend get a child
// span and carry its `traceparent`, which the backend continues. Spans are
// exported only when OTEL_EXPORTER_OTLP_ENDPOINT is set (same variable as the
// backend), but the header is sent either way.
export function register() {
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "felinoir-frontend",
    propagators: [new OriginTraceContextPropagator()],
    instrumentationConfig: {
      fetch: { propagateContextUrls: [BACKEND_URL] },
    },
  });
}
