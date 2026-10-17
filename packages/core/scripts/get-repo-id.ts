import { githubForInstallation } from "../src/index.js";

async function main() {
  const client = await githubForInstallation(172425928);
  const repos = await client.listRepos();
  console.log("=== ACCESSIBLE REPOSITORIES ===");
  for (const r of repos) {
    console.log(r);
  }
}

main().catch(console.error);
