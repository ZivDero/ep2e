// Point system.json's download URL at this version's release asset.
// The manifest URL tracks the latest release, but each release's own
// system.json should download that exact version, so users can reinstall
// an older build (e.g. 1.3.x for Foundry V13). Used by the release workflow.
import { promises as fs } from "fs";

const repository = process.env.GITHUB_REPOSITORY;
if (!repository) throw new Error("GITHUB_REPOSITORY is not set");

const system = JSON.parse(await fs.readFile("system.json", "utf8"));
system.download = `https://github.com/${repository}/releases/download/${system.version}/latest.zip`;
await fs.writeFile("system.json", JSON.stringify(system, null, 2) + "\n");
console.log(`download: ${system.download}`);
