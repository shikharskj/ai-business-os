const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const pkgDeps = { ...pkg.dependencies, ...pkg.devDependencies };

for (const d of Object.keys(pkgDeps)) {
  const inPackages = Object.keys(lock.packages || {}).some(
    (p) => p === `node_modules/${d}` || p.endsWith("/" + d)
  );
  const inLockDeps = Object.hasOwn(lock.dependencies || {}, d);
  if (!inPackages && !inLockDeps) {
    console.error("Lockfile missing", d);
    process.exit(2);
  }
}

console.log("lockfile appears in sync");
