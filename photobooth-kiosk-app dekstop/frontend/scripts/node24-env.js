/**
 * Prefer Homebrew node@24 on macOS so pack/build scripts avoid broken default node
 * (e.g. dyld simdjson mismatch after brew upgrades).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const NODE24_CANDIDATES =
  process.platform === "darwin"
    ? ["/opt/homebrew/opt/node@24/bin", "/usr/local/opt/node@24/bin"]
    : [];

function resolveNode24BinDir() {
  for (const dir of NODE24_CANDIDATES) {
    const nodeBin = path.join(dir, process.platform === "win32" ? "node.exe" : "node");
    if (!fs.existsSync(nodeBin)) continue;
    try {
      execFileSync(nodeBin, ["-v"], { stdio: "pipe" });
      return dir;
    } catch {
      /* broken dylib or unreadable binary */
    }
  }
  return null;
}

function prependNode24Path() {
  const dir = resolveNode24BinDir();
  if (!dir) return null;

  const parts = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  if (!parts.includes(dir)) {
    process.env.PATH = `${dir}${path.delimiter}${process.env.PATH || ""}`;
  }
  return dir;
}

function getNode24Env(extra = {}) {
  prependNode24Path();
  return { ...process.env, ...extra };
}

/** Re-exec this script with node@24 when the current node is outside 20–24. */
function reexecWithNode24IfNeeded(scriptPath) {
  const node24Dir = resolveNode24BinDir();
  if (!node24Dir) return false;

  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (major >= 20 && major <= 24) return false;

  const nodeBin = path.join(node24Dir, "node");
  const args = [scriptPath, ...process.argv.slice(2)];
  const result = spawnSync(nodeBin, args, {
    stdio: "inherit",
    env: getNode24Env(),
  });
  process.exit(result.status ?? 1);
}

module.exports = {
  resolveNode24BinDir,
  prependNode24Path,
  getNode24Env,
  reexecWithNode24IfNeeded,
};
