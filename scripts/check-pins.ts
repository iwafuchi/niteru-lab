// 依存がバージョンとチェックサム（digest）で固定されているかを検査する（pnpm check:pins）。
// 方針は docs/dependencies.md の「バージョンとチェックサムの固定」
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

/** 完全に固定しなくてよい依存と、その理由 */
const RANGE_ALLOWED: Record<string, string> = {
  // Lambda のランタイム（Node.js 24）の型の範囲で、パッチやマイナーの更新を受け入れる
  "@types/node": "Node.js 24 の型の範囲で更新する",
};

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PNPM_WITH_SHA512 = /^pnpm@\d+\.\d+\.\d+\+sha512\.[0-9a-f]{128}$/;
const IMAGE_WITH_DIGEST = /@sha256:[0-9a-f]{64}$/;
const COMPOSE_IMAGE = /^\s*image:\s*["']?([^"'\s#]+)/gm;

const packageJsonSchema = z.object({
  packageManager: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});
type PackageJson = z.infer<typeof packageJsonSchema>;

export function findPinViolations(input: { packageJson: PackageJson; compose: string }): string[] {
  const violations: string[] = [];
  const { packageJson, compose } = input;

  for (const field of ["dependencies", "devDependencies"] as const) {
    for (const [name, version] of Object.entries(packageJson[field] ?? {})) {
      if (name in RANGE_ALLOWED) continue;
      if (!EXACT_VERSION.test(version)) {
        violations.push(`${field} の ${name} が完全に固定されていない: ${version}`);
      }
    }
  }

  const packageManager = packageJson.packageManager ?? "";
  if (!PNPM_WITH_SHA512.test(packageManager)) {
    violations.push(`packageManager がバージョンと sha512 で固定されていない: ${packageManager}`);
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
