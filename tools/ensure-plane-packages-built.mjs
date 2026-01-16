import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const target = process.argv[2] ?? "admin";

const configByTarget = {
  admin: {
    packages: [
      "@plane/constants",
      "@plane/hooks",
      "@plane/propel",
      "@plane/services",
      "@plane/types",
      "@plane/ui",
      "@plane/utils",
    ],
    requiredOutputs: [
      "packages/constants/dist/index.mjs",
      "packages/hooks/dist/index.js",
      "packages/propel/dist/button/index.js",
      "packages/services/dist/index.js",
      "packages/types/dist/index.mjs",
      "packages/ui/dist/index.js",
      "packages/utils/dist/index.js",
    ],
  },
  web: {
    packages: [
      "@plane/constants",
      "@plane/editor",
      "@plane/hooks",
      "@plane/i18n",
      "@plane/propel",
      "@plane/services",
      "@plane/shared-state",
      "@plane/types",
      "@plane/ui",
      "@plane/utils",
    ],
    requiredOutputs: [
      "packages/constants/dist/index.mjs",
      "packages/editor/dist/index.js",
      "packages/hooks/dist/index.js",
      "packages/i18n/dist/index.js",
      "packages/propel/dist/button/index.js",
      "packages/services/dist/index.js",
      "packages/shared-state/dist/index.js",
      "packages/types/dist/index.mjs",
      "packages/ui/dist/index.js",
      "packages/utils/dist/index.js",
    ],
  },
  space: {
    packages: [
      "@plane/constants",
      "@plane/editor",
      "@plane/hooks",
      "@plane/i18n",
      "@plane/propel",
      "@plane/services",
      "@plane/types",
      "@plane/ui",
      "@plane/utils",
    ],
    requiredOutputs: [
      "packages/constants/dist/index.mjs",
      "packages/editor/dist/index.js",
      "packages/hooks/dist/index.js",
      "packages/i18n/dist/index.js",
      "packages/propel/dist/button/index.js",
      "packages/services/dist/index.js",
      "packages/types/dist/index.mjs",
      "packages/ui/dist/index.js",
      "packages/utils/dist/index.js",
    ],
  },
};

const config = configByTarget[target];

if (!config) {
  throw new Error(`Unknown target: ${target}`);
}

const missing = config.requiredOutputs.filter((p) => !fs.existsSync(path.join(repoRoot, p)));

if (missing.length === 0) {
  process.exit(0);
}

const args = [
  "-r",
  ...config.packages.flatMap((p) => ["--filter", p]),
  "--if-present",
  "build",
];

const result = spawnSync("pnpm", args, {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
