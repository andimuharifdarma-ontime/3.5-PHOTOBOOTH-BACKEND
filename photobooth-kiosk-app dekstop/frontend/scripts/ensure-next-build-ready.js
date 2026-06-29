#!/usr/bin/env node
/**
 * Prevent silent next build hangs caused by concurrent builds waiting on .next/lock.
 */
const { reexecWithNode24IfNeeded, prependNode24Path } = require("./node24-env");
reexecWithNode24IfNeeded(__filename);
prependNode24Path();

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const frontendRoot = path.join(__dirname, "..");
const forceClean = process.argv.includes("--force");

function sleepSync(ms) {
  if (process.platform === "win32") {
    spawnSync("ping", ["127.0.0.1", "-n", String(Math.ceil(ms / 1000) + 1)], {
      stdio: "ignore",
    });
    return;
  }
  spawnSync("sleep", [String(Math.max(1, Math.ceil(ms / 1000)))], { stdio: "ignore" });
}

function listNextBuildProcesses() {
  try {
    const out = execSync('pgrep -fl "[./]bin/next build" 2>/dev/null || true', {
      encoding: "utf8",
    });
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((line) => line.includes(frontendRoot));
  } catch {
    return [];
  }
}

function clearNextBuildLock() {
  for (const rel of [".next/lock", ".next/cache/webpack.lock"]) {
    const lockPath = path.join(frontendRoot, rel);
    if (fs.existsSync(lockPath)) {
      console.log(`▶ Removing Next.js build lock: ${rel}`);
      fs.rmSync(lockPath, { force: true });
    }
  }
}

function warnNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (major > 24) {
    console.error(
      `❌ Node.js ${process.versions.node} tidak didukung untuk build kiosk.`,
    );
    console.error("   Gunakan Node 20–24 (disarankan: 24).");
    console.error("");
    console.error("   Perbaikan (pilih salah satu):");
    console.error("     nvm install 24 && nvm use 24");
    console.error(
      '     brew install node@24 && export PATH="/opt/homebrew/opt/node@24/bin:$PATH"',
    );
    process.exit(1);
  }
  if (major === 24) {
    console.log(`▶ Node.js ${process.versions.node} OK`);
  }
}

function stopStaleBuilds(lines) {
  for (const line of lines) {
    const pid = Number.parseInt(line.split(/\s+/)[0], 10);
    if (!pid || pid === process.pid) continue;
    try {
      process.kill(pid, "SIGTERM");
      console.log(`▶ Stopped stale next build (pid ${pid})`);
    } catch {
      /* already exited */
    }
  }
  sleepSync(1500);
  const stillRunning = listNextBuildProcesses();
  for (const line of stillRunning) {
    const pid = Number.parseInt(line.split(/\s+/)[0], 10);
    if (!pid || pid === process.pid) continue;
    try {
      process.kill(pid, "SIGKILL");
      console.log(`▶ Force-killed next build (pid ${pid})`);
    } catch {
      /* already exited */
    }
  }
  sleepSync(500);
  const leftover = listNextBuildProcesses();
  if (leftover.length > 0) {
    console.error("❌ Masih ada proses next build setelah cleanup:");
    for (const line of leftover) console.error(`   ${line.trim()}`);
    process.exit(1);
  }
}

const running = listNextBuildProcesses();

if (running.length > 0) {
  console.warn(`⚠ ${running.length} proses next build lama ditemukan — dihentikan.`);
  stopStaleBuilds(running);
}

warnNodeVersion();

if (forceClean) {
  for (const entry of fs.readdirSync(frontendRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".next") {
      const target = path.join(frontendRoot, entry.name);
      const quarantine = path.join(frontendRoot, `.next.quarantine-${Date.now()}`);
      console.log(`▶ Moving ${entry.name} → ${path.basename(quarantine)}`);
      fs.renameSync(target, quarantine);
    }
  }

  const nextStage = path.join(frontendRoot, "dist-resources", "next");
  if (fs.existsSync(nextStage)) {
    console.log("▶ Removing dist-resources/next");
    fs.rmSync(nextStage, { recursive: true, force: true });
  }

  const nodeCache = path.join(frontendRoot, "node_modules", ".cache");
  if (fs.existsSync(nodeCache)) {
    console.log("▶ Removing node_modules/.cache");
    fs.rmSync(nodeCache, { recursive: true, force: true });
  }
} else {
  clearNextBuildLock();
}
