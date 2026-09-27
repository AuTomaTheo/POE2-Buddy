import { runtimeFingerprint } from "./fingerprint.js";

const directory = process.argv[2];
if (!directory) {
  console.error("Usage: fingerprint-cli <runtime-directory>");
  process.exit(1);
}
process.stdout.write(runtimeFingerprint(directory));
