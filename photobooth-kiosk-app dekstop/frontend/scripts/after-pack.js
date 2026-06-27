/**
 * electron-builder skips node_modules in extraResources — copy them after pack.
 */
const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const projectDir = packager.projectDir;
  const product = packager.appInfo.productFilename;

  const resourcesDir = path.join(
    appOutDir,
    process.platform === "darwin" ? `${product}.app/Contents/Resources` : "resources",
  );

  const copies = [
    ["dist-resources/backend/node_modules", "backend/node_modules"],
    ["dist-resources/next/node_modules", "next/node_modules"],
  ];

  for (const [fromRel, toRel] of copies) {
    const src = path.join(projectDir, fromRel);
    const dest = path.join(resourcesDir, toRel);

    if (!fs.existsSync(src)) {
      console.warn(`[after-pack] skip missing: ${fromRel}`);
      continue;
    }

    console.log(`[after-pack] copying ${fromRel} → ${toRel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
};
