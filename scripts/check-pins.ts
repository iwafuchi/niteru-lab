// 依存がバージョンとチェックサム（digest）で固定されているかを検査する（pnpm check:pins）。
// 方針は docs/dependencies.md の「バージョンとチェックサムの固定」
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

/** 完全に固定しなくてよい依存と、許す範囲。例外を足すときは理由も書く */
const RANGE_ALLOWED = new Map<string, RegExp>([
  // Lambda のランタイム（Node.js 24）の型の範囲で、パッチやマイナーの更新を受け入れる
  ["@types/node", /^\^?24\.\d+\.\d+$/],
]);

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PNPM_WITH_SHA512 = /^pnpm@(\d+\.\d+\.\d+)\+sha512\.[0-9a-f]{128}$/;
const IMAGE_WITH_DIGEST = /@sha256:[0-9a-f]{64}$/;
const COMPOSE_IMAGE = /^\s*image:\s*["']?([^"'\s#]+)/gm;

const versions = z.record(z.string(), z.string()).optional();
const packageJsonSchema = z.object({
  packageManager: z.string().optional(),
  devEngines: z
    .object({ packageManager: z.object({ version: z.string().optional() }).optional() })
    .optional(),
  dependencies: versions,
  devDependencies: versions,
  optionalDependencies: versions,
  pnpm: z.object({ overrides: versions }).optional(),
});
type PackageJson = z.infer<typeof packageJsonSchema>;

export function findPinViolations(input: { packageJson: PackageJson; compose: string }): string[] {
  const violations: string[] = [];
  const { packageJson, compose } = input;

  const groups: [string, Record<string, string> | undefined][] = [
    ["dependencies", packageJson.dependencies],
    ["devDependencies", packageJson.devDependencies],
    ["optionalDependencies", packageJson.optionalDependencies],
    ["pnpm.overrides", packageJson.pnpm?.overrides],
  ];
  for (const [field, deps] of groups) {
    for (const [name, version] of Object.entries(deps ?? {})) {
      if (EXACT_VERSION.test(version)) continue;
      if (RANGE_ALLOWED.get(name)?.test(version)) continue;
      violations.push(`${field} の ${name} が完全に固定されていない: ${version}`);
    }
  }

  const packageManager = packageJson.packageManager ?? "";
  const pnpmVersion = PNPM_WITH_SHA512.exec(packageManager)?.[1];
  if (pnpmVersion === undefined) {
    violations.push(`packageManager がバージョンと sha512 で固定されていない: ${packageManager}`);
  } else {
    // devEngines の onFail: download はハッシュを検証しないため、packageManager と同じ版にそろえる
    const devEnginesVersion = packageJson.devEngines?.packageManager?.version;
    if (devEnginesVersion !== undefined && devEnginesVersion !== pnpmVersion) {
      violations.push(
        `devEngines の pnpm のバージョン（${devEnginesVersion}）が packageManager（${pnpmVersion}）と一致しない`,
      );
    }
  }

  for (const [, image] of compose.matchAll(COMPOSE_IMAGE)) {
    if (image !== undefined && !IMAGE_WITH_DIGEST.test(image)) {
      violations.push(`compose.yaml のイメージが digest で固定されていない: ${image}`);
    }
  }

  return violations;
}

function main(): void {
  const root = path.join(import.meta.dirname, "..");
  const violations = findPinViolations({
    packageJson: packageJsonSchema.parse(
      JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")),
    ),
    compose: readFileSync(path.join(root, "compose.yaml"), "utf8"),
  });
  if (violations.length > 0) {
    console.error(["依存の固定に違反があります:", ...violations.map((v) => `- ${v}`)].join("\n"));
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
