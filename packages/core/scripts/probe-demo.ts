import { probe } from "../src/index.js";

async function main() {
  const url = "https://firebreak-demo-pi.vercel.app/api/health";
  console.log(`Probing ${url}...`);
  const result = await probe(url);
  console.log("Probe result:", result);
}

main().catch(console.error);
