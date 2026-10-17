import { db, vercelConnections, services, workspaceAiKeys } from "../src/db/index.js";
import { openSecret, sealSecret } from "../src/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const oldKeyB64 = process.env.ENCRYPTION_KEY_PREVIOUS;
  const newKeyB64 = process.env.ENCRYPTION_KEY;

  if (!oldKeyB64 || !newKeyB64) {
    console.error("Error: Both ENCRYPTION_KEY_PREVIOUS and ENCRYPTION_KEY must be set in environment.");
    process.exit(1);
  }

  const oldKey = Buffer.from(oldKeyB64, "base64");
  const newKey = Buffer.from(newKeyB64, "base64");

  if (oldKey.length !== 32 || newKey.length !== 32) {
    console.error("Error: Keys must be exactly 32 bytes when base64 decoded.");
    process.exit(1);
  }

  console.log("Starting database secrets re-encryption...");
  const database = db();

  // 1. Vercel connections
  const vcList = await database.select().from(vercelConnections);
  console.log(`Checking ${vcList.length} Vercel connection(s)...`);
  for (const vc of vcList) {
    try {
      const plaintext = openSecret(vc.encryptedToken, vc.workspaceId, oldKey);
      const resealed = sealSecret(plaintext, vc.workspaceId, newKey);
      await database
        .update(vercelConnections)
        .set({ encryptedToken: resealed, updatedAt: new Date() })
        .where(eq(vercelConnections.id, vc.id));
      console.log(`  ✓ Re-encrypted Vercel connection ${vc.id}`);
    } catch (err: any) {
      console.warn(`  ⚠ Failed to re-encrypt Vercel connection ${vc.id}:`, err.message);
    }
  }

  // 2. Services alert HMAC secrets
  const svcList = await database.select().from(services);
  console.log(`Checking ${svcList.length} service(s)...`);
  for (const svc of svcList) {
    try {
      const plaintext = openSecret(svc.alertHmacSecret, svc.workspaceId, oldKey);
      const resealed = sealSecret(plaintext, svc.workspaceId, newKey);
      await database
        .update(services)
        .set({ alertHmacSecret: resealed, updatedAt: new Date() })
        .where(eq(services.id, svc.id));
      console.log(`  ✓ Re-encrypted service alert secret ${svc.id}`);
    } catch (err: any) {
      console.warn(`  ⚠ Failed to re-encrypt service ${svc.id}:`, err.message);
    }
  }

  // 3. Workspace AI Keys
  const aiList = await database.select().from(workspaceAiKeys);
  console.log(`Checking ${aiList.length} AI key(s)...`);
  for (const k of aiList) {
    try {
      const plaintext = openSecret(k.encryptedKey, k.workspaceId, oldKey);
      const resealed = sealSecret(plaintext, k.workspaceId, newKey);
      await database
        .update(workspaceAiKeys)
        .set({ encryptedKey: resealed, updatedAt: new Date() })
        .where(eq(workspaceAiKeys.id, k.id));
      console.log(`  ✓ Re-encrypted AI key ${k.id} (${k.provider})`);
    } catch (err: any) {
      console.warn(`  ⚠ Failed to re-encrypt AI key ${k.id}:`, err.message);
    }
  }

  console.log("Re-encryption complete.");
}

main().catch((err) => {
  console.error("Fatal re-encryption error:", err);
  process.exit(1);
});
