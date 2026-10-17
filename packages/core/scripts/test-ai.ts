import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { generateText, Output } from "ai";
import { modelFor, INCIDENT_ANALYST_SYSTEM_PROMPT, AnalysisSchema } from "../src/ai";

async function main() {
  const provider = (process.env.TEST_AI_PROVIDER || "anthropic") as any;
  const apiKey = process.env.TEST_AI_API_KEY;

  if (!apiKey) {
    console.log("TEST_AI_API_KEY is not set. Skipping AI prompt regression suite (as expected in CI).");
    process.exit(0);
  }

  console.log(`Running AI prompt regression suite against ${provider}...`);

  const demoBundle = `
<incident>
  <alert>
    <error_type>TypeError</error_type>
    <error_message>Cannot read properties of undefined (reading 'reduce')</error_message>
    <stack>
      <frame file="app/pricing.bad.ts" line="18" function="calculateTotal" source="hint" />
    </stack>
  </alert>
  <suspects>
    <suspect id="sus_1" sha="1300d48" rank="1">
      <diff file="app/pricing.bad.ts">
+ return items.reduce((acc, item) => acc + item.price, 0);
      </diff>
    </suspect>
  </suspects>
</incident>
  `.trim();

  try {
    const model = modelFor(provider, apiKey);
    const { output } = await generateText({
      model,
      system: INCIDENT_ANALYST_SYSTEM_PROMPT,
      prompt: demoBundle,
      output: Output.object({ schema: AnalysisSchema }),
      maxOutputTokens: 1500,
      abortSignal: AbortSignal.timeout(60_000),
    });

    console.log("Analysis output received:", JSON.stringify(output, null, 2));
    if (output.likelyCause?.suspectId === "sus_1") {
      console.log("✓ Regression Test 1 passed: Identified sus_1 as likely cause.");
    } else {
      console.warn("⚠ Test 1 returned unexpected suspect:", output.likelyCause?.suspectId);
    }
    process.exit(0);
  } catch (err: any) {
    console.error("AI test error:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
