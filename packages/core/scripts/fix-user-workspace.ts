import { db, workspaces, workspace_members, user, github_installations } from "../src/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const database = db();

  // Find Shaik Raiyan user
  const [shaikUser] = await database.select().from(user).where(eq(user.email, "shaikraiyan2005@gmail.com"));
  if (!shaikUser) {
    console.error("Shaik Raiyan user not found!");
    return;
  }
  console.log("Shaik Raiyan User ID:", shaikUser.id);

  // Remove empty workspace created during fresh login
  const emptyWsId = "ws_1tu783e6uc39n4erced8";
  await database.delete(workspace_members).where(eq(workspace_members.workspace_id, emptyWsId));
  await database.delete(workspaces).where(eq(workspaces.id, emptyWsId));
  console.log("Removed empty workspace:", emptyWsId);

  // Point ws_1alsok80tozt4sqaq650 (which has GitHub, Vercel, Service, Incidents) to Shaik Raiyan
  const primaryWsId = "ws_1alsok80tozt4sqaq650";
  await database
    .update(workspaces)
    .set({
      owner_user_id: shaikUser.id,
      name: "Shaik Raiyan's Workspace",
    })
    .where(eq(workspaces.id, primaryWsId));

  // Update membership
  await database
    .delete(workspace_members)
    .where(eq(workspace_members.workspace_id, primaryWsId));

  await database
    .insert(workspace_members)
    .values({
      workspace_id: primaryWsId,
      user_id: shaikUser.id,
      role: "owner",
    });

  console.log("Reassigned workspace", primaryWsId, "to", shaikUser.id);

  // Check installations for primaryWsId
  const ghis = await database
    .select()
    .from(github_installations)
    .where(eq(github_installations.workspace_id, primaryWsId));
  console.log("GitHub Installations now active for Shaik Raiyan:", ghis);
}

main().catch(console.error);
