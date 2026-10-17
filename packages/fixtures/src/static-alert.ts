import { runFire } from "./fire.js";

// Run fire with --static flag forced
runFire({ static: true }).catch((err) => {
  console.error("Static alert fixture failed:", err);
  process.exit(1);
});
