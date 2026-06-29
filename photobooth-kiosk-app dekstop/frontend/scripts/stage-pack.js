#!/usr/bin/env node
/**
 * Stages Next.js standalone + NestJS production bundle for electron-builder.
 * Run on the target OS (macOS for .app, Windows for .exe installer).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const frontendRoot = path.join(__dirname, "..");
const kioskRoot = path.join(frontendRoot, "..");
const backendRoot = path.join(kioskRoot, "backend");
const stageRoot = path.join(frontendRoot, "dist-resources");
const nextStage = path.join(stageRoot, "next");
const backendStage = path.join(stageRoot, "backend");
const isWin = process.platform === "win32";

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

console.log(`▶ Packaging for ${process.platform} (${process.arch})`);
console.log("▶ Building Next.js (standalone)...");
execSync("npm run build", { cwd: frontendRoot, stdio: "inherit" });

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

console.log("▶ Building NestJS backend...");
if (!fs.existsSync(path.join(backendRoot, "package.json"))) {
  console.error(
    "Missing backend/package.json — restore the kiosk backend from git:\n" +
      '  git checkout 49d10f0 -- "photobooth-kiosk-app dekstop/backend/"',
  );
  process.exit(1);
}
execSync("npx prisma generate", { cwd: backendRoot, stdio: "inherit" });
execSync("npm run build", { cwd: backendRoot, stdio: "inherit" });

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
execSync("npm ci --omit=dev", { cwd: backendStage, stdio: "inherit" });
execSync("npx prisma generate", { cwd: backendStage, stdio: "inherit" });

const cameraRoot = path.join(kioskRoot, "python-camera-service");
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

console.log("✓ Stage complete:", stageRoot);
if (isWin) {
  console.log("▶ Next: npm run pack:win     → NSIS installer (.exe)");
  console.log("         npm run pack:win:dir → unpacked folder for testing");
} else {
  console.log("▶ Next: npm run pack:dir → macOS .app");
}
