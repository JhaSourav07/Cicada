import { NextResponse, NextRequest } from "next/server";
import { checkDbConnectivity } from "@/lib/db/mongodb";
import { ensureDatabaseIndexes, listDatabaseIndexes } from "@/lib/db/indexes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const shouldInit = searchParams.get("initIndexes") === "true";

  let indexReports;
  try {
    if (shouldInit) {
      indexReports = await ensureDatabaseIndexes();
    } else {
      indexReports = await listDatabaseIndexes();
    }
  } catch {
    // Graceful fallback if indexes not queried
  }

  return NextResponse.json({
    connected: true,
    database: result.database,
    latencyMs: result.latencyMs,
    indexes: indexReports,
  });
}
