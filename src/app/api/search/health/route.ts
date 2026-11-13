import { NextResponse } from "next/server";
import { getSearchConfig } from "@/lib/search/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSearchConfig();
  const start = performance.now();

  try {
    const url = new URL("/search", config.baseUrl);
    url.searchParams.set("q", "ping");
    url.searchParams.set("format", "json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      return NextResponse.json(
        {
          connected: false,
          baseUrl: config.baseUrl,
          statusCode: res.status,
          error: `SearXNG returned HTTP ${res.status}`,
          latencyMs,
        },
        { status: 503 }
      );
    }

    const data = await res.json();
    const hasResults = Array.isArray(data.results);

    return NextResponse.json({
      connected: true,
      baseUrl: config.baseUrl,
      latencyMs,
      resultsAvailable: hasResults,
    });
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json(
      {
        connected: false,
        baseUrl: config.baseUrl,
        error: msg,
        latencyMs,
      },
      { status: 503 }
    );
  }
}
