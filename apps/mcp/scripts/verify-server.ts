import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

// Load environment from root and local
dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

import {
  workspacesRepo,
  createMcpKey,
  validateMcpKey,
  systemCtx,
  userCtx,
  db,
  workspaces,
  user,
  type Database,
} from "@firebreak/core";
import { KeyService } from "../src/shared/key.service.js";
import { McpKeyGuard } from "../src/auth/mcp-key.guard.js";
import { ServiceTools } from "../src/modules/services/services.tools.js";
import { IncidentTools } from "../src/modules/incidents/incidents.tools.js";
import { ActionTools } from "../src/modules/actions/actions.tools.js";

async function verify() {
  console.log("--- 1. Checking Built Artifacts ---");
  const widgetsOutDir = path.resolve(__dirname, "../src/widgets/out");
  const expectedWidgets = ["incident-card.html", "suspect-list.html", "action-status.html"];
  for (const w of expectedWidgets) {
    const fullPath = path.join(widgetsOutDir, w);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing expected widget HTML artifact: ${w}`);
    }
    const stat = fs.statSync(fullPath);
    console.log(`✓ Widget artifact found: ${w} (${stat.size} bytes)`);
  }

  const manifestPath = path.resolve(__dirname, "../src/widgets/widget-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Missing widget-manifest.json");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (!manifest.widgets || manifest.widgets.length !== 3) {
    throw new Error(`Expected 3 widgets in manifest, got ${manifest.widgets?.length}`);
  }
  console.log("✓ widget-manifest.json verified with 3 widgets and example data");

  console.log("\n--- 2. Checking Tool Classes & DI Metadata ---");
  const serviceTools = new ServiceTools();
  const incidentTools = new IncidentTools();
  const actionTools = new ActionTools();
  console.log("✓ ServiceTools, IncidentTools, and ActionTools instantiated cleanly");

  console.log("\n--- 3. Database Auth & Key Verification ---");
  const [existingWs] = await db().select().from(workspaces).limit(1);
  let wsId: string;
  let ownerUserId: string;
  if (existingWs) {
    wsId = existingWs.id;
    ownerUserId = existingWs.owner_user_id;
    console.log(`✓ Using existing workspace: ${wsId}`);
  } else {
    ownerUserId = "usr_smoke_" + Date.now();
    await db().insert(user).values({
      id: ownerUserId,
      name: "Smoke Test User",
      email: `smoke_${Date.now()}@example.com`,
      emailVerified: true,
    });
    const ws = await workspacesRepo.bootstrapPersonalWorkspace(ownerUserId, "Smoke Test Workspace");
    wsId = ws.id;
    console.log(`✓ Bootstrapped workspace: ${wsId}`);
  }

  const ctx = userCtx(wsId, ownerUserId);
  const { key, record } = await createMcpKey(ctx, {
    name: "M7 Verification Key",
    scopes: ["incidents:read", "actions:propose", "actions:approve"],
  });
  console.log(`✓ Generated test MCP key: ${record.prefix}... (id: ${record.id})`);

  // Direct validateMcpKey check
  const verifiedCore = await validateMcpKey(key);
  if (!verifiedCore || verifiedCore.workspaceId !== wsId) {
    throw new Error("Core validateMcpKey failed for generated key");
  }
  console.log("✓ @firebreak/core validateMcpKey verified");

  // KeyService cache check
  const keyService = new KeyService();
  const verifiedId1 = await keyService.validate(key);
  if (!verifiedId1 || verifiedId1.workspaceId !== wsId) {
    throw new Error("KeyService failed on initial lookup");
  }
  const verifiedId2 = await keyService.validate(key);
  if (!verifiedId2 || verifiedId2.keyId !== verifiedId1.keyId) {
    throw new Error("KeyService failed on cached lookup");
  }
  console.log("✓ KeyService memory caching and identity resolution verified");

  // McpKeyGuard check
  const guard = new McpKeyGuard(keyService);

  // Negative 1: No auth header
  const fakeCtxNoAuth: any = {
    metadata: {},
    logger: { warn: () => {}, info: () => {}, error: () => {} },
  };
  const allowedNoAuth = await guard.canActivate(fakeCtxNoAuth);
  if (allowedNoAuth) {
    throw new Error("SECURITY FAILURE: McpKeyGuard allowed request without Authorization header");
  }
  console.log("✓ McpKeyGuard correctly refused request with missing header");

  // Negative 2: Bad key
  const fakeCtxBadAuth: any = {
    metadata: { authorization: "Bearer fbk_invalid_random_key_12345" },
    logger: { warn: () => {}, info: () => {}, error: () => {} },
  };
  const allowedBadAuth = await guard.canActivate(fakeCtxBadAuth);
  if (allowedBadAuth) {
    throw new Error("SECURITY FAILURE: McpKeyGuard allowed request with invalid key");
  }
  console.log("✓ McpKeyGuard correctly refused request with invalid key");

  // Positive: Valid key in Authorization header
  const fakeCtxValid: any = {
    metadata: { authorization: `Bearer ${key}` },
    logger: { warn: () => {}, info: () => {}, error: () => {} },
  };
  const allowedValid = await guard.canActivate(fakeCtxValid);
  if (!allowedValid) {
    throw new Error("McpKeyGuard denied valid key");
  }
  if (!fakeCtxValid.auth?.authenticated || fakeCtxValid.auth.subject !== verifiedId1.userId) {
    throw new Error("McpKeyGuard failed to attach expected auth details to context");
  }
  console.log("✓ McpKeyGuard successfully authenticated valid key and set context");

  console.log("\n--- 4. Checking Tool Execution Under Authenticated Context ---");
  const listServicesResult = await serviceTools.listServices({}, fakeCtxValid);
  if (!Array.isArray(listServicesResult)) {
    throw new Error("listServices did not return an array");
  }
  console.log(`✓ listServices executed cleanly (${listServicesResult.length} services found)`);

  const listIncidentsResult = await incidentTools.listIncidents({ status: "all", limit: 5 }, fakeCtxValid);
  if (!Array.isArray(listIncidentsResult)) {
    throw new Error("listIncidents did not return an array");
  }
  console.log(`✓ listIncidents executed cleanly (${listIncidentsResult.length} incidents found)`);

  console.log("\n🎉 All M7 MCP server verification tests passed successfully!");
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  });
