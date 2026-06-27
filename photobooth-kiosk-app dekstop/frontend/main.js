const { app, BrowserWindow, dialog, utilityProcess } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn, execSync } = require("child_process");

const KIOSK_URL = "http://127.0.0.1:3001";
const BACKEND_URL = "http://127.0.0.1:3000";
const CAMERA_URL = "http://127.0.0.1:8000";

const BACKEND_TIMEOUT_MS = 45000;
const NEXT_TIMEOUT_MS = 45000;
const CAMERA_TIMEOUT_MS = 6000;

const KIOSK_PORTS = [3000, 3001, 8000];

let mainWindow = null;
let splashWindow = null;
let isQuitting = false;
let isBooting = false;
let cleanupDone = false;
const childProcesses = [];
const utilityChildren = [];
const serviceLogs = new Map();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resourcesPath(...segments) {
  return path.join(process.resourcesPath, ...segments);
}

function freePort(port) {
  if (process.platform === "win32") {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        shell: true,
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid} /T`, {
          stdio: "ignore",
          shell: true,
        });
      }
    } catch {
      /* port already free */
    }
    return;
  }

  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    /* port already free */
  }
}

async function freeKioskPorts() {
  for (const port of KIOSK_PORTS) {
    freePort(port);
  }
  await sleep(process.platform === "win32" ? 600 : 400);
}

function waitForUrl(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.setTimeout(2000, () => req.destroy());

      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 400);
      });
    };

    attempt();
  });
}

async function waitForUrlOptional(url, timeoutMs) {
  try {
    await waitForUrl(url, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function rememberServiceLog(name, text) {
  const lines = serviceLogs.get(name) || [];
  lines.push(...text.split(/\r?\n/).filter(Boolean));
  serviceLogs.set(name, lines.slice(-40));
}

function getServiceLogTail(name, count = 6) {
  const lines = serviceLogs.get(name) || [];
  return lines.slice(-count).join("\n");
}

function attachStreamLogs(name, stdout, stderr) {
  const onData = (chunk, isErr) => {
    const text = chunk.toString();
    rememberServiceLog(name, text);
    const line = text.trim();
    if (!line) return;
    if (isErr) console.error(`[${name}]`, line);
    else console.log(`[${name}]`, line);
  };

  stdout?.on("data", (chunk) => onData(chunk, false));
  stderr?.on("data", (chunk) => onData(chunk, true));
}

function findServiceHandle(name) {
  const spawned = childProcesses.find((proc) => proc.serviceName === name);
  if (spawned) return spawned;
  const utility = utilityChildren.find((proc) => proc.serviceName === name);
  return utility || null;
}

function forkNodeService(name, modulePath, options) {
  const child = utilityProcess.fork(modulePath, [], {
    cwd: options.cwd,
    env: options.env,
    stdio: "pipe",
    serviceName: name,
  });

  child.serviceName = name;
  attachStreamLogs(name, child.stdout, child.stderr);
  child.on("exit", (code) => {
    console.log(`[${name}] exited code=${code}`);
  });

  utilityChildren.push(child);
  return child;
}

function spawnCameraService(cameraDir, pythonBin) {
  const uvicornArgs = [
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
  ];

  // macOS: jalankan via bash agar proses Python tidak muncul sebagai ikon "exec" di Dock
  if (process.platform === "darwin") {
    const quoted = [pythonBin, ...uvicornArgs]
      .map((part) => `'${String(part).replace(/'/g, `'\\''`)}'`)
      .join(" ");
    return spawnLogged("camera", "/bin/bash", ["-lc", quoted], {
      cwd: cameraDir,
      env: process.env,
    });
  }

  return spawnLogged("camera", pythonBin, uvicornArgs, {
    cwd: cameraDir,
    env: process.env,
    shell: process.platform === "win32",
  });
}

function rebuildHint() {
  return process.platform === "win32"
    ? "npm run pack:win"
    : "npm run pack:dir";
}

function packagedAppHint() {
  return process.platform === "win32"
    ? "folder instalasi SelftFoto Kiosk"
    : ".app";
}

function quitHint() {
  return process.platform === "win32"
    ? "Tutup aplikasi sepenuhnya (Alt+F4 atau keluar dari tray), tunggu 2 detik, lalu buka lagi"
    : "Tutup app sepenuhnya (Cmd+Q), tunggu 2 detik, buka lagi";
}

function detectStartupFailure(name) {
  const log = (serviceLogs.get(name) || []).join("\n");
  const rebuild = rebuildHint();

  if (/python-multipart|multipart_not_installed/i.test(log)) {
    return (
      "Camera service gagal start (python-multipart belum terinstall).\n\n" +
      `Rebuild aplikasi dengan ${rebuild} setelah update requirements.txt.`
    );
  }

  if (/PrismaClientInitializationError|Error querying the database/i.test(log)) {
    return (
      "Backend gagal terhubung ke database Supabase.\n\n" +
      "Perbaiki DATABASE_URL di photobooth-kiosk-app dekstop/backend/.env " +
      "(salin dari Supabase Dashboard → Project Settings → Database), " +
      `lalu rebuild: ${rebuild}`
    );
  }

  if (/ENOENT|Cannot find module/i.test(log)) {
    return `Layanan ${name} gagal start karena file/modul tidak ditemukan. Rebuild dengan ${rebuild}.`;
  }

  if (/No Python at|python is not recognized|was not found/i.test(log)) {
    return (
      "Python tidak ditemukan untuk camera service.\n\n" +
      "Di Windows: install Python 3.10+ dari python.org (centang Add to PATH), " +
      `lalu rebuild dengan ${rebuild}.\n` +
      "Atau buat venv di python-camera-service sebelum build."
    );
  }

  const tail = getServiceLogTail(name);
  if (tail) {
    return `Layanan ${name} berhenti saat startup:\n${tail}`;
  }

  return `Layanan ${name} berhenti sebelum siap.`;
}

function waitForService(name, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = findServiceHandle(name);
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      if (child && onExit) child.removeListener("exit", onExit);
      if (err) reject(err);
      else resolve();
    };

    const onExit = (code, signal) => {
      if (code === 0 && !signal) return;
      finish(new Error(detectStartupFailure(name)));
    };

    if (child) {
      child.on("exit", onExit);
    }

    const poll = setInterval(() => {
      const req = http.get(url, (res) => {
        res.resume();
        finish();
      });
      req.setTimeout(2000, () => req.destroy());
      req.on("error", () => {});
    }, 400);

    setTimeout(() => {
      const hint = getServiceLogTail(name);
      let message = `Timeout waiting for ${url}`;
      if (/PrismaClientInitializationError|Error querying the database/i.test(hint)) {
        message = detectStartupFailure(name);
      } else if (hint) {
        message += `\n\nLog terakhir ${name}:\n${hint}`;
      }
      finish(new Error(message));
    }, timeoutMs);
  });
}

function spawnLogged(name, command, args, options) {
  const proc = spawn(command, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    windowsHide: true,
  });

  proc.serviceName = name;
  attachStreamLogs(name, proc.stdout, proc.stderr);
  proc.on("exit", (code, signal) => {
    console.log(`[${name}] exited code=${code} signal=${signal}`);
  });

  childProcesses.push(proc);
  return proc;
}

function killAllChildren() {
  serviceLogs.clear();

  for (const child of utilityChildren.splice(0)) {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
  }

  for (const proc of childProcesses.splice(0)) {
    if (!proc?.pid || proc.killed) continue;
    const pid = proc.pid;
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(pid), "/f", "/t"], {
          stdio: "ignore",
          windowsHide: true,
        });
      } else {
        proc.kill("SIGTERM");
        setTimeout(() => {
          try {
            process.kill(pid, 0);
            proc.kill("SIGKILL");
          } catch {
            /* already dead */
          }
        }, 800);
      }
    } catch {
      /* ignore */
    }
  }
}

async function shutdownServices() {
  killAllChildren();
  await freeKioskPorts();
}

function resolvePython(cameraDir) {
  const isWin = process.platform === "win32";
  const candidates = isWin
    ? [
        path.join(cameraDir, "venv", "Scripts", "python.exe"),
        path.join(cameraDir, ".venv", "Scripts", "python.exe"),
        path.join(cameraDir, "venv", "Scripts", "python"),
        path.join(cameraDir, ".venv", "Scripts", "python"),
      ]
    : [
        path.join(cameraDir, "venv", "bin", "python3"),
        path.join(cameraDir, "venv", "bin", "python"),
        path.join(cameraDir, ".venv", "bin", "python3"),
        path.join(cameraDir, ".venv", "bin", "python"),
      ];

  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }

  return isWin ? "python" : "python3";
}

function createSplashWindow(message = "Menyalakan layanan kiosk...") {
  if (splashWindow) return;

  splashWindow = new BrowserWindow({
    width: 720,
    height: 420,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: "#0c0a09",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0c0a09;color:#fafaf9;font-family:system-ui,sans-serif;flex-direction:column;gap:16px}
    .spinner{width:42px;height:42px;border:3px solid rgba(255,255,255,.15);
    border-top-color:#A68B67;border-radius:50%;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:18px;margin:0}p{font-size:13px;opacity:.7;margin:0}
  </style></head><body><div class="spinner"></div><h1>SelftFoto Kiosk</h1><p>${message}</p></body></html>`;

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );
}

function closeSplashWindow() {
  if (!splashWindow) return;
  splashWindow.close();
  splashWindow = null;
}

async function startPackagedServices() {
  const nextDir = resourcesPath("next");
  const backendDir = resourcesPath("backend");
  const cameraDir = resourcesPath("camera");

  const nextServer = path.join(nextDir, "server.js");
  const nestMain = path.join(backendDir, "dist", "main.js");
  const cameraMain = path.join(cameraDir, "main.py");

  if (!fs.existsSync(nextServer)) {
    throw new Error(`Next server not found: ${nextServer}`);
  }
  if (!fs.existsSync(nestMain)) {
    throw new Error(`NestJS build not found: ${nestMain}`);
  }
  if (!fs.existsSync(cameraMain)) {
    throw new Error(`Camera service not found: ${cameraMain}`);
  }

  const backendEnvPath = path.join(backendDir, ".env");
  if (!fs.existsSync(backendEnvPath)) {
    throw new Error(
      `File backend/.env tidak ditemukan di dalam ${packagedAppHint()}.\n\n` +
        "Buat photobooth-kiosk-app dekstop/backend/.env dari .env.example, " +
        `isi DATABASE_URL Supabase, lalu rebuild: ${rebuildHint()}`,
    );
  }

  await shutdownServices();

  const serviceEnv = (extra) => ({
    ...process.env,
    ...extra,
  });

  forkNodeService("nestjs", nestMain, {
    cwd: backendDir,
    env: serviceEnv({ PORT: "3000", KIOSK_FRONTEND_URL: KIOSK_URL }),
  });

  forkNodeService("next", nextServer, {
    cwd: nextDir,
    env: serviceEnv({ PORT: "3001", HOSTNAME: "127.0.0.1" }),
  });

  const pythonBin = resolvePython(cameraDir);
  spawnCameraService(cameraDir, pythonBin);

  await Promise.all([
    waitForService("nestjs", BACKEND_URL, BACKEND_TIMEOUT_MS),
    waitForService("next", KIOSK_URL, NEXT_TIMEOUT_MS),
  ]);

  void waitForUrlOptional(CAMERA_URL, CAMERA_TIMEOUT_MS).then((ok) => {
    if (!ok) console.warn("Camera service not ready — live view may be unavailable");
  });
}

function createWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  const iconPath = app.isPackaged
    ? path.join(
        process.resourcesPath,
        process.platform === "win32" && fs.existsSync(path.join(process.resourcesPath, "icon.ico"))
          ? "icon.ico"
          : "icon.png",
      )
    : path.join(
        __dirname,
        "build",
        process.platform === "win32" ? "icon.ico" : "icon.png",
      );
  const resolvedIcon =
    fs.existsSync(iconPath)
      ? iconPath
      : path.join(__dirname, "build", "icon.png");

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    show: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(resolvedIcon) ? resolvedIcon : undefined,
    backgroundColor: "#0c0a09",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    closeSplashWindow();
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
    console.error("Page failed to load:", code, description);
    dialog.showErrorBox(
      "SelftFoto Kiosk",
      `Gagal memuat antarmuka (${description}). ${quitHint()}.`,
    );
  });

  mainWindow.loadURL(KIOSK_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootPackagedApp() {
  if (isBooting) return;
  isBooting = true;
  try {
    createSplashWindow();
    await startPackagedServices();
    createWindow();
  } finally {
    isBooting = false;
  }
}

async function handleStartupError(err) {
  closeSplashWindow();
  console.error(err);
  await shutdownServices();
  dialog.showErrorBox(
    "SelftFoto Kiosk — Startup Error",
    `${err.message}\n\nTips:\n• Periksa DATABASE_URL di backend/.env (harus sama dengan backend-admin)\n• Pastikan project Supabase aktif dan koneksi internet stabil\n• ${quitHint()}\n• Rebuild setelah mengubah backend/.env: ${rebuildHint()}`,
  );
  app.quit();
}

app.on("ready", async () => {
  try {
    if (app.isPackaged) {
      await bootPackagedApp();
    } else {
      createWindow();
    }
  } catch (err) {
    await handleStartupError(err);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", (event) => {
  if (!app.isPackaged || cleanupDone) return;
  event.preventDefault();
  cleanupDone = true;
  shutdownServices().finally(() => {
    app.exit(0);
  });
});

app.on("window-all-closed", () => {
  closeSplashWindow();
  if (app.isPackaged) {
    isQuitting = true;
    app.quit();
    return;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (isQuitting || isBooting) return;

  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  try {
    if (app.isPackaged) {
      await bootPackagedApp();
    } else {
      createWindow();
    }
  } catch (err) {
    await handleStartupError(err);
  }
});

app.on("second-instance", async () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  if (!app.isPackaged || isBooting) return;

  try {
    await bootPackagedApp();
  } catch (err) {
    await handleStartupError(err);
  }
});

process.on("SIGINT", () => {
  isQuitting = true;
  void shutdownServices().finally(() => app.quit());
});

process.on("SIGTERM", () => {
  isQuitting = true;
  void shutdownServices().finally(() => app.quit());
});
