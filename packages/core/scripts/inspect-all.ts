import { db } from "../src/db/client.js";
import { user, session, account, workspaces, workspace_members, github_installations, vercel_connections, services } from "../src/db/schema.js";

async function main() {
  const database = db();
  const allUsers = await database.select().from(user);
  console.log("=== USERS ===");
  console.log(allUsers.map(u => ({ id: u.id, email: u.email, name: u.name })));

  const allAccounts = await database.select().from(account);
  console.log("=== ACCOUNTS ===");
  console.log(allAccounts.map(a => ({ id: a.id, userId: a.userId, providerId: a.providerId, accountId: a.accountId })));

  const allWorkspaces = await database.select().from(workspaces);
  console.log("=== WORKSPACES ===");
  console.log(allWorkspaces.map(w => ({ id: w.id, name: w.name, owner: w.owner_user_id })));

  const allMembers = await database.select().from(workspace_members);
  console.log("=== MEMBERS ===");
  console.log(allMembers);

  const allGH = await database.select().from(github_installations);
  console.log("=== GITHUB INSTALLATIONS ===");
  console.log(allGH.map(g => ({
    id: g.id,
    wsId: g.workspace_id,
    ghInstallId: g.installation_id,
    account: g.account_login,
    targetType: g.account_type,
  })));

  const allVercel = await database.select().from(vercel_connections);
  console.log("=== VERCEL CONNECTIONS ===");
  console.log(allVercel.map(v => ({
    id: v.id,
    wsId: v.workspace_id,
    account: v.account_label,
    teamId: v.team_id,
  })));

  const allServices = await database.select().from(services);
  console.log("=== SERVICES ===");
  console.log(allServices.map(s => ({
    id: s.id,
    name: s.name,
    wsId: s.workspace_id,
    repo: s.repo_owner + "/" + s.repo_name,
    healthUrl: s.health_url,
    alertSecretLast4: s.alert_secret_last4,
  })));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
