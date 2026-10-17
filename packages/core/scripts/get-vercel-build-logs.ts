import { requireEnv } from "../src/index.js";

async function main() {
  const token = requireEnv("VERCEL_TOKEN");
  const dplId = "dpl_FhjwWyCEZEf3L5q7TVC9uYwvgSQK";
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`https://api.vercel.com/v2/deployments/${dplId}/events`, { headers });
  const data = await res.json();
  console.log("=== BUILD LOG EVENTS ===");
  if (Array.isArray(data)) {
    for (const ev of data.slice(-40)) {
      console.log(ev.text || ev.payload?.text || ev);
    }
  } else {
    console.log(data);
  }
}

main().catch(console.error);
