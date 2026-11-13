import { NextResponse } from "next/server";
import { checkDbConnectivity } from "@/lib/db/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkDbConnectivity();

  if (!result.connected) {
    return NextResponse.json(
      {
        connected: false,
        database: result.database,
        error: result.error,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    connected: true,
    database: result.database,
    latencyMs: result.latencyMs,
  });
}
