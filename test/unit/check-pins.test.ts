import { describe, expect, test } from "vitest";
import { findPinViolations } from "../../scripts/check-pins";

const PNPM_SHA512 = "a".repeat(128);
const IMAGE_SHA256 = "b".repeat(64);

// 違反のない状態。各テストはここから 1 か所だけ変える
function validInput() {
  return {
    packageJson: {
      packageManager: `pnpm@12.18.0+sha512.${PNPM_SHA512}`,
      devEngines: { packageManager: { name: "pnpm", version: "12.18.0" } },
      dependencies: { hono: "4.13.17" } as Record<string, string>,
      devDependencies: { "aws-cdk-lib": "2.275.0", "@types/node": "^24.19.2" } as Record<
        string,
        string
      >,
      optionalDependencies: {} as Record<string, string>,
      pnpm: { overrides: {} as Record<string, string> },
    },
    compose: `services:\n  floci:\n    image: floci/floci:2.4.0@sha256:${IMAGE_SHA256}\n`,
  };
}

describe("依存の固定の検査", () => {
  test("すべて固定されていれば違反はない", () => {
    expect(findPinViolations(validInput())).toEqual([]);
  });

  describe("package.json の依存", () => {
    test.each([
      ["^ 付き", "^4.13.17"],
      ["~ 付き", "~4.13.17"],
      ["範囲指定", ">=4.0.0"],
      ["latest", "latest"],
      ["メジャーだけ", "4"],
    ])("バージョンが%sなら違反になる", (_label, version) => {
      const input = validInput();
      input.packageJson.dependencies.hono = version;
      expect(findPinViolations(input)).toEqual([
        `dependencies の hono が完全に固定されていない: ${version}`,
      ]);
    });

    test("devDependencies も同じく検査する", () => {
      const input = validInput();
      input.packageJson.devDependencies["aws-cdk-lib"] = "^2.275.0";
      expect(findPinViolations(input)).toEqual([
        "devDependencies の aws-cdk-lib が完全に固定されていない: ^2.275.0",
      ]);
    });

    test("プレリリース版の完全な指定は固定とみなす", () => {
      const input = validInput();
      input.packageJson.dependencies.hono = "5.0.0-rc.1";
      expect(findPinViolations(input)).toEqual([]);
    });

    test("optionalDependencies と pnpm.overrides も同じく検査する", () => {
      const input = validInput();
      input.packageJson.optionalDependencies["fsevents"] = "^2.3.3";
      input.packageJson.pnpm.overrides["esbuild"] = "^0.28.2";
      expect(findPinViolations(input)).toEqual([
        "optionalDependencies の fsevents が完全に固定されていない: ^2.3.3",
        "pnpm.overrides の esbuild が完全に固定されていない: ^0.28.2",
      ]);
    });

    test("Object のプロトタイプと同じ名前の依存も、例外扱いせずに検査する", () => {
      const input = validInput();
      input.packageJson.dependencies["constructor"] = "^1.0.0";
      expect(findPinViolations(input)).toEqual([
        "dependencies の constructor が完全に固定されていない: ^1.0.0",
      ]);
    });

    describe("@types/node は Node.js 24 の型の範囲（^24.x.y）だけを例外として許す", () => {
      test.each(["^24.19.2", "^24.20.0", "24.19.2"])("%s は許す", (version) => {
        const input = validInput();
        input.packageJson.devDependencies["@types/node"] = version;
        expect(findPinViolations(input)).toEqual([]);
      });

      test.each(["^25.0.0", "^22.0.0", "latest", "*", "~24.19.2"])("%s は違反になる", (version) => {
        const input = validInput();
        input.packageJson.devDependencies["@types/node"] = version;
        expect(findPinViolations(input)).toEqual([
          `devDependencies の @types/node が完全に固定されていない: ${version}`,
        ]);
      });
    });
  });

  describe("pnpm 本体", () => {
    test.each([
      ["ハッシュがない", "pnpm@12.18.0"],
      ["ハッシュが sha512 でない", `pnpm@12.18.0+sha256.${IMAGE_SHA256}`],
      ["バージョンが範囲指定", `pnpm@^12.18.0+sha512.${PNPM_SHA512}`],
    ])("packageManager の%sなら違反になる", (_label, packageManager) => {
      const input = validInput();
      input.packageJson.packageManager = packageManager;
      expect(findPinViolations(input)).toEqual([
        `packageManager がバージョンと sha512 で固定されていない: ${packageManager}`,
      ]);
    });
  });

  test("devEngines の pnpm のバージョンが packageManager と違えば違反になる", () => {
    const input = validInput();
    input.packageJson.devEngines.packageManager.version = "12.17.0";
    expect(findPinViolations(input)).toEqual([
      "devEngines の pnpm のバージョン（12.17.0）が packageManager（12.18.0）と一致しない",
    ]);
  });

  describe("compose.yaml の Docker イメージ", () => {
    test.each([
      ["タグだけ", "floci/floci:2.4.0"],
      ["latest", "floci/floci:latest"],
      ["digest が短い", `floci/floci:2.4.0@sha256:${"b".repeat(10)}`],
    ])("image が%sなら違反になる", (_label, image) => {
      const input = validInput();
      input.compose = `services:\n  floci:\n    image: ${image}\n`;
      expect(findPinViolations(input)).toEqual([
        `compose.yaml のイメージが digest で固定されていない: ${image}`,
      ]);
    });

    test("イメージが複数あれば、すべてを検査する", () => {
      const input = validInput();
      input.compose += `  other:\n    image: "redis:7"\n`;
      expect(findPinViolations(input)).toEqual([
        "compose.yaml のイメージが digest で固定されていない: redis:7",
      ]);
    });
  });

  test("違反が複数あれば、すべてを報告する", () => {
    const input = validInput();
    input.packageJson.dependencies.hono = "^4.13.17";
    input.packageJson.packageManager = "pnpm@12.18.0";
    expect(findPinViolations(input)).toHaveLength(2);
  });
});
