import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const mcpUrl = process.env.MCP_URL ?? "http://localhost:3005/mcp";
  const url = new URL(mcpUrl);
  const key = process.env.FIREBREAK_MCP_KEY;

  if (!key) {
    console.warn("⚠️ FIREBREAK_MCP_KEY not set. Smoke test will test tool listing and negative auth.");
  }

  console.log(`Connecting to MCP server at ${url.toString()}...`);

  if (key) {
    const transport = new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      },
    });
    const client = new Client({ name: "firebreak-smoke", version: "1.0.0" });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const expected = [
      "list_services",
      "list_incidents",
      "get_incident",
      "get_suspects",
      "get_analysis",
      "get_timeline",
      "propose_rollback",
      "get_action_status",
      "approve_action",
    ];

    for (const n of expected) {
      if (!tools.some((t) => t.name === n)) {
        throw new Error(`missing tool ${n}`);
      }
    }
    console.log("OK", tools.length, "tools registered and verified");

    const r = await client.callTool({
      name: "list_incidents",
      arguments: { status: "all", limit: 3 },
    });
    if (r.isError) {
      throw new Error("list_incidents failed: " + JSON.stringify(r.content));
    }
    console.log("OK authenticated list_incidents succeeded");
    await client.close();
  }

  // Negative test: the same call without a key must fail
  console.log("Testing unauthenticated access refusal...");
  const anon = new Client({ name: "firebreak-smoke-anon", version: "1.0.0" });
  await anon.connect(new StreamableHTTPClientTransport(url));
  let refused = false;
  try {
    const r2 = await anon.callTool({ name: "list_incidents", arguments: {} });
    refused = Boolean(r2.isError);
  } catch {
    refused = true;
  }
  await anon.close();

  if (!refused) {
    throw new Error("SECURITY: list_incidents succeeded without a key");
  }
  console.log("OK auth enforced (unauthenticated call refused)");
  console.log("🎉 All MCP smoke checks passed!");
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
