import { NextResponse } from "next/server";
import { ollamaClient } from "@/lib/ai/ollama";

export async function GET() {
  const result = await ollamaClient.checkConnectivity();

  if (!result.connected) {
    return NextResponse.json(
      {
        status: "disconnected",
        defaultModel: ollamaClient.defaultModel,
        error: result.error,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "connected",
    version: result.version,
    defaultModel: ollamaClient.defaultModel,
  });
}
