import { ollamaClient } from "../src/lib/ai/ollama";

async function runBenchmark() {
  console.log("=== CICADA Ollama Local Benchmark ===");
  const model = "qwen3.5:9b";
  const prompt = "Explain the difference between TCP and UDP in 3 concise bullet points.";

  console.log(`Model: ${model}`);
  console.log(`Prompt: "${prompt}"`);
  console.log("Starting generation...");

  const startTime = performance.now();
  let timeToFirstToken: number | null = null;
  let tokenCount = 0;
  let generatedText = "";
  let finalDoneChunk: any = null;

  try {
    const stream = ollamaClient.chatStream({
      model,
      messages: [{ role: "user", content: prompt }],
      numCtx: 8192,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      if (chunk.message?.content) {
        if (timeToFirstToken === null) {
          timeToFirstToken = performance.now() - startTime;
        }
        tokenCount++;
        generatedText += chunk.message.content;
      }
      if (chunk.done) {
        finalDoneChunk = chunk;
      }
    }

    const totalTimeMs = performance.now() - startTime;
    const tokensPerSec = finalDoneChunk?.eval_count && finalDoneChunk?.eval_duration
      ? (finalDoneChunk.eval_count / (finalDoneChunk.eval_duration / 1e9)).toFixed(2)
      : (tokenCount / (totalTimeMs / 1000)).toFixed(2);

    console.log("\n--- Benchmark Results ---");
    console.log(`Time to first token (TTFT): ${timeToFirstToken ? timeToFirstToken.toFixed(2) : "N/A"} ms`);
    console.log(`Total duration: ${(totalTimeMs / 1000).toFixed(2)} s`);
    console.log(`Tokens generated: ${finalDoneChunk?.eval_count || tokenCount}`);
    console.log(`Prompt tokens: ${finalDoneChunk?.prompt_eval_count || "N/A"}`);
    console.log(`Generation speed: ${tokensPerSec} tokens/sec`);
    console.log("\n--- Generated Sample ---");
    console.log(generatedText.trim());
  } catch (err) {
    console.error("Benchmark failed:", err);
  }
}

runBenchmark();
