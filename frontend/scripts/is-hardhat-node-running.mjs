import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

try {
  const res = execSync("node -v", { stdio: "pipe" }).toString();
  console.log(`Node is available: ${res.trim()}`);
} catch {
  console.error("Node.js is not available in PATH.");
  process.exit(1);
}

// Windows-friendly no-op script placeholder (kept for parity with template)
const readmePath = path.resolve("./README.md");
if (!fs.existsSync(readmePath)) {
  fs.writeFileSync(readmePath, "# VehicleCondition Frontend\n", "utf-8");
}
console.log("is-hardhat-node-running: OK");


