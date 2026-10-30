import { registerOTel } from "@vercel/otel";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import type { Context } from "@opentelemetry/api";
import type { Instrumentation } from "next";

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
// backend), but the header is sent either way. In Node.js, the root spans also
// feed the access log (src/lib/request-log.ts).
export async function register() {
  const spanProcessors =
    process.env.NEXT_RUNTIME === "nodejs"
      ? ["auto" as const, new (await import("./lib/request-log")).RequestLogProcessor()]
      : ["auto" as const];
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "felinoir-frontend",
    propagators: [new OriginTraceContextPropagator()],
    spanProcessors,
    instrumentationConfig: {
      fetch: { propagateContextUrls: [BACKEND_URL] },
    },
  });
}

/** Errors thrown while rendering a page or running a route handler. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { log } = await import("./lib/log");
  log.error("next", `Unhandled error in ${context.routeType} ${context.routePath}`, {
    error,
    "http.request.method": request.method,
    "url.path": request.path.split("?", 1)[0],
    "http.route": context.routePath,
  });
};
