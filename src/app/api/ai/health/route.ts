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

  // Check models
  try {
    const models = await ollamaClient.listModels();
    const isDefaultInstalled = models.some(
      (m) =>
        m.name === ollamaClient.defaultModel ||
        m.name === `${ollamaClient.defaultModel}:latest` ||
        (ollamaClient.defaultModel.endsWith(":latest") &&
          m.name === ollamaClient.defaultModel.replace(":latest", ""))
    );

    return NextResponse.json({
      status: isDefaultInstalled ? "connected" : "model_missing",
      version: result.version,
      availableModelCount: models.length,
      defaultModel: ollamaClient.defaultModel,
      isDefaultModelInstalled: isDefaultInstalled,
      models: models.map((m) => m.name),
    });
  } catch {
    return NextResponse.json({
      status: "connected",
      version: result.version,
      availableModelCount: 0,
      defaultModel: ollamaClient.defaultModel,
      isDefaultModelInstalled: false,
      models: [],
    });
  }
}
