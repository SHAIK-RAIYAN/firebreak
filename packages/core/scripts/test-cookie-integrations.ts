import { db } from "../src/db/client.js";
import { session } from "../src/db/schema.js";

async function main() {
  const database = db();
  const s = await database.select().from(session).limit(1);
  if (!s[0]) {
    console.log("No session found in DB");
    return;
  }
  const token = s[0].token;
  console.log("Testing with token:", token.substring(0, 10) + "...");

  const res = await fetch("http://localhost:3000/api/v1/integrations", {
    headers: {
      cookie: `better-auth.session_token=${token}`,
    },
  });
  console.log("Local /api/v1/integrations response status:", res.status);
  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2));

  const prodRes = await fetch("https://firebreak-pi.vercel.app/api/v1/integrations", {
    headers: {
      cookie: `better-auth.session_token=${token}`,
    },
  });
  console.log("Prod /api/v1/integrations response status:", prodRes.status);
  const prodJson = await prodRes.json();
  console.log("Prod Response:", JSON.stringify(prodJson, null, 2));
}

main().catch(console.error);
