import { auth } from "../../../apps/web/src/lib/auth.ts";
import { db } from "../src/db/client.js";
import { session } from "../src/db/schema.js";

async function main() {
  const database = db();
  const s = await database.select().from(session).limit(1);
  const token = s[0].token;
  console.log("Token:", token);

  const testHeaders = new Headers();
  testHeaders.set("cookie", `better-auth.session_token=${token}`);
  const sess = await auth.api.getSession({ headers: testHeaders });
  console.log("Session with better-auth.session_token:", sess);

  // Test with Bearer token
  const bearerHeaders = new Headers();
  bearerHeaders.set("authorization", `Bearer ${token}`);
  const sess2 = await auth.api.getSession({ headers: bearerHeaders });
  console.log("Session with Bearer:", sess2);
}

main().catch(console.error);
