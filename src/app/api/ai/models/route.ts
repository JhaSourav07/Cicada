import { NextResponse } from "next/server";
import { ollamaClient, OllamaError } from "@/lib/ai/ollama";

export async function GET() {
  try {
    const models = await ollamaClient.listModels();
    return NextResponse.json({
      models,
      defaultModel: ollamaClient.defaultModel,
    });
  } catch (err: unknown) {
    if (err instanceof OllamaError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
        },
        { status: err.statusCode || 503 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to query locally installed Ollama models",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
