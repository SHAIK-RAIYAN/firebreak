import {
  db,
  workspaces,
  github_installations,
  vercel_connections,
  services,
  githubForInstallation,
  verifyInstallation,
} from "../src/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const database = db();

  const ghis = await database.select().from(github_installations);
  console.log("=== GITHUB INSTALLATIONS IN DB ===");
  console.log(ghis);

  for (const ghi of ghis) {
    try {
      console.log(`Checking verification for installation_id: ${ghi.installation_id}...`);
      const verified = await verifyInstallation(ghi.installation_id);
      console.log("Verified Installation:", verified);

      const client = await githubForInstallation(ghi.installation_id);
      const repos = await client.listRepos();
      console.log(`Accessible repositories for ${ghi.installation_id}:`);
      console.log(repos.map(r => r.fullName));
    } catch (err: any) {
      console.error(`Error checking installation ${ghi.installation_id}:`, err.message);
    }
  }

  // Clean up stale installation
  await database.delete(github_installations).where(eq(github_installations.installation_id, 64188201));

  // Ensure service points to valid GHI ghi_tstqayysuny5eoesm19e
  const activeGhi = ghis.find(g => g.installation_id === 172425928);
  if (activeGhi) {
    await database.update(services).set({ github_installation_id: activeGhi.id }).where(eq(services.id, "svc_zz053ecqgo0go9nbyq0a"));
  }

  const updatedSvcs = await database.select().from(services);
  console.log("=== SERVICES IN DB ===");
  console.log(updatedSvcs.map(s => ({
    id: s.id,
    name: s.name,
    repo_owner: s.repo_owner,
    repo_name: s.repo_name,
    github_installation_id: s.github_installation_id,
    vercel_project_id: s.vercel_project_id,
    health_url: s.health_url,
    health_expected_status: s.health_expected_status,
    alert_secret_last4: s.alert_secret_last4,
  })));

  const vcs = await database.select().from(vercel_connections);
  console.log("=== VERCEL CONNECTIONS IN DB ===");
  console.log(vcs.map(v => ({
    id: v.id,
    workspace_id: v.workspace_id,
    account_label: v.account_label,
    token_last4: v.token_last4,
  })));
}

main().catch(console.error);
