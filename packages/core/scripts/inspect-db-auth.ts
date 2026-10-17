import { db, workspaces, user, session, workspace_members, github_installations } from "../src/index.js";

async function main() {
  const database = db();
  const wsList = await database.select().from(workspaces);
  console.log("=== WORKSPACES ===");
  console.log(wsList);

  const uList = await database.select().from(user);
  console.log("=== USERS ===");
  console.log(uList);

  const sList = await database.select().from(session);
  console.log("=== SESSIONS ===");
  console.log(sList);

  const wmList = await database.select().from(workspace_members);
  console.log("=== WORKSPACE MEMBERS ===");
  console.log(wmList);

  const ghiList = await database.select().from(github_installations);
  console.log("=== GITHUB INSTALLATIONS ===");
  console.log(ghiList);
}

main().catch(console.error);
