#!/usr/bin/env node
/**
 * Stages Next.js standalone + NestJS production bundle for electron-builder.
 * Run on the target OS (macOS for .app, Windows for .exe installer).
 */
const { reexecWithNode24IfNeeded, getNode24Env } = require("./node24-env");
reexecWithNode24IfNeeded(__filename);

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const frontendRoot = path.join(__dirname, "..");
const kioskRoot = path.join(frontendRoot, "..");
const backendRoot = path.join(kioskRoot, "backend");
const cameraRoot = path.join(kioskRoot, "python-camera-service");
const stageRoot = path.join(frontendRoot, "dist-resources");
const nextStage = path.join(stageRoot, "next");
const backendStage = path.join(stageRoot, "backend");
const stageStampPath = path.join(stageRoot, ".stage-stamp.json");
const isWin = process.platform === "win32";
const isFast = process.argv.includes("--fast");
const forceClean = process.argv.includes("--force-clean");

function runNextBuild() {
  console.log("▶ Building Next.js standalone (turbopack, ~2–6 menit)...");
  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");
  execSync(`node "${nextBin}" build --turbopack`, {
    cwd: frontendRoot,
    stdio: "inherit",
    env: getNode24Env({
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=8192"]
        .filter(Boolean)
        .join(" "),
    }),
  });
}

function findServerRoot(dir) {
  const direct = path.join(dir, "server.js");
  if (fs.existsSync(direct)) return dir;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const found = findServerRoot(path.join(dir, entry.name));
    if (found) return found;
  }
  return null;
}

function isNextStageFresh() {
  const stamp = readStageStamp();
  if (!stamp?.nextBuildId) return false;

  const buildIdPath = path.join(frontendRoot, ".next", "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) return false;
  const buildId = fs.readFileSync(buildIdPath, "utf8").trim();
  if (stamp.nextBuildId !== buildId) return false;

  const standaloneRoot = findServerRoot(path.join(frontendRoot, ".next", "standalone"));
  if (!standaloneRoot) return false;

  return Boolean(findServerRoot(nextStage));
}

function ensureNextBuildReady() {
  execSync(`node scripts/ensure-next-build-ready.js${forceClean ? " --force" : ""}`, {
    cwd: frontendRoot,
    stdio: "inherit",
    env: getNode24Env(),
  });
}

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest);
  }
}

function resolveCameraVenvPython(cameraRoot) {
  const candidates = isWin
    ? [
        path.join(cameraRoot, "venv", "Scripts", "python.exe"),
        path.join(cameraRoot, ".venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(cameraRoot, "venv", "bin", "python3"),
        path.join(cameraRoot, ".venv", "bin", "python3"),
        path.join(cameraRoot, ".venv", "bin", "python"),
      ];

  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

function ensureCameraVenv(cameraRoot) {
  let pythonBin = resolveCameraVenvPython(cameraRoot);
  if (pythonBin) return pythonBin;

  const venvDir = path.join(cameraRoot, isWin ? "venv" : ".venv");
  const launcher = isWin ? "python" : "python3";

  console.log(`▶ Creating camera venv at ${venvDir}...`);
  execSync(`"${launcher}" -m venv "${venvDir}"`, {
    cwd: cameraRoot,
    stdio: "inherit",
    shell: isWin,
  });

  pythonBin = resolveCameraVenvPython(cameraRoot);
  if (!pythonBin) {
    console.warn(
      "⚠ Camera venv could not be created — install Python 3.10+ and retry, or create venv manually.",
    );
  }
  return pythonBin;
}

function fileMtimeMs(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).mtimeMs;
}

function readStageStamp() {
  try {
    return JSON.parse(fs.readFileSync(stageStampPath, "utf8"));
  } catch {
    return null;
  }
}

function writeStageStamp() {
  const buildIdPath = path.join(frontendRoot, ".next", "BUILD_ID");
  let nextBuildId = null;
  if (fs.existsSync(buildIdPath)) {
    nextBuildId = fs.readFileSync(buildIdPath, "utf8").trim();
  }

  fs.mkdirSync(stageRoot, { recursive: true });
  fs.writeFileSync(
    stageStampPath,
    JSON.stringify(
      {
        backendLockMtime: fileMtimeMs(path.join(backendRoot, "package-lock.json")),
        requirementsMtime: fileMtimeMs(path.join(cameraRoot, "requirements.txt")),
        nextBuildId,
        stagedAt: Date.now(),
      },
      null,
      2,
    ),
  );
}

function isBackendStageFresh() {
  const stamp = readStageStamp();
  if (!stamp) return false;

  const lockPath = path.join(backendRoot, "package-lock.json");
  if (
    stamp.backendLockMtime !== fileMtimeMs(lockPath) ||
    !fs.existsSync(path.join(backendStage, "node_modules")) ||
    !fs.existsSync(path.join(backendStage, "dist", "main.js"))
  ) {
    return false;
  }
  return true;
}

function isCameraDepsFresh() {
  const stamp = readStageStamp();
  if (!stamp) return false;

  const reqPath = path.join(cameraRoot, "requirements.txt");
  if (stamp.requirementsMtime !== fileMtimeMs(reqPath)) return false;
  return Boolean(resolveCameraVenvPython(cameraRoot));
}

function stageNestBackend() {
  console.log("▶ Building NestJS backend...");
  if (!fs.existsSync(path.join(backendRoot, "package.json"))) {
    console.error(
      "Missing backend/package.json — restore the kiosk backend from git:\n" +
        '  git checkout 49d10f0 -- "photobooth-kiosk-app dekstop/backend/"',
    );
    process.exit(1);
  }
  execSync("npx prisma generate", { cwd: backendRoot, stdio: "inherit", env: getNode24Env() });
  execSync("npm run build", { cwd: backendRoot, stdio: "inherit", env: getNode24Env() });

  console.log("▶ Staging NestJS backend...");
  rmrf(backendStage);
  fs.mkdirSync(backendStage, { recursive: true });

  for (const file of ["package.json", "package-lock.json"]) {
    copyIfExists(path.join(backendRoot, file), path.join(backendStage, file));
  }
  copyDir(path.join(backendRoot, "prisma"), path.join(backendStage, "prisma"));
  copyDir(path.join(backendRoot, "dist"), path.join(backendStage, "dist"));
  copyIfExists(path.join(backendRoot, ".env"), path.join(backendStage, ".env"));

  console.log("▶ Installing backend production dependencies (this may take a minute)...");
  execSync("npm ci --omit=dev", { cwd: backendStage, stdio: "inherit", env: getNode24Env() });
  execSync("npx prisma generate", { cwd: backendStage, stdio: "inherit", env: getNode24Env() });
}

function stageCameraDeps() {
  const cameraVenvPython = ensureCameraVenv(cameraRoot);
  if (cameraVenvPython) {
    console.log("▶ Installing camera service Python dependencies...");
    execSync(`"${cameraVenvPython}" -m pip install -r requirements.txt`, {
      cwd: cameraRoot,
      stdio: "inherit",
      shell: isWin,
    });
  } else {
    console.warn(
      "⚠ Skipping camera pip install — bundled app will need Python on PATH or a prebuilt venv in python-camera-service/",
    );
  }
}

console.log(`▶ Packaging for ${process.platform} (${process.arch})${isFast ? " [fast]" : ""}`);
ensureNextBuildReady();

let backendRebuilt = false;
let cameraRebuilt = false;
let nextRebuilt = false;

if (isFast && isNextStageFresh()) {
  console.log("▶ [fast] Reusing Next.js build (skip next build + stage copy)");
} else {
  if (isFast) {
    console.log("▶ [fast] Next.js cache miss — running next build once");
  }
  runNextBuild();
  nextRebuilt = true;

  const standaloneSrc = path.join(frontendRoot, ".next", "standalone");
  const serverRoot = findServerRoot(standaloneSrc);
  if (!serverRoot) {
    console.error("Missing server.js under .next/standalone — is output: 'standalone' enabled?");
    process.exit(1);
  }

  console.log("▶ Staging Next.js standalone from", serverRoot);
  rmrf(nextStage);
  copyDir(serverRoot, nextStage);
  copyDir(
    path.join(frontendRoot, ".next", "static"),
    path.join(nextStage, ".next", "static"),
  );
  const publicSrc = path.join(frontendRoot, "public");
  if (fs.existsSync(publicSrc)) {
    copyDir(publicSrc, path.join(nextStage, "public"));
  } else {
    console.warn("⚠ public/ not found — skipping static asset copy");
  }
}

if (isFast && isBackendStageFresh()) {
  console.log("▶ [fast] Reusing staged NestJS backend (skip build + npm ci)");
} else {
  if (isFast) {
    console.log("▶ [fast] Backend cache miss — running full NestJS stage once");
  }
  stageNestBackend();
  backendRebuilt = true;
}

if (isFast && isCameraDepsFresh()) {
  console.log("▶ [fast] Reusing camera Python venv (skip pip install)");
} else {
  if (isFast) {
    console.log("▶ [fast] Camera deps cache miss — running pip install once");
  }
  stageCameraDeps();
  cameraRebuilt = true;
}

if (!isFast || backendRebuilt || cameraRebuilt || nextRebuilt) {
  writeStageStamp();
}

console.log("✓ Stage complete:", stageRoot);
if (isWin) {
  console.log("▶ Next: npm run pack:win     → NSIS installer (.exe)");
  console.log("         npm run pack:win:dir → unpacked folder for testing");
} else {
  console.log("▶ Next: npm run pack:dir → macOS .app");
}
