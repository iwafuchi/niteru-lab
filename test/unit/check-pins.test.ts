import { describe, expect, test } from "vitest";
import { findPinViolations } from "../../scripts/check-pins";

const PNPM_SHA512 = "a".repeat(128);
const IMAGE_SHA256 = "b".repeat(64);

// 違反のない状態。各テストはここから 1 か所だけ変える
function validInput() {
  return {
    packageJson: {
      packageManager: `pnpm@12.18.0+sha512.${PNPM_SHA512}`,
      dependencies: { hono: "4.13.17" },
      devDependencies: { "aws-cdk-lib": "2.275.0", "@types/node": "^24.19.2" },
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

    test("例外として許可した @types/node だけは ^ 付きでもよい（Node.js 24 の型の範囲で更新するため）", () => {
      const input = validInput();
      input.packageJson.devDependencies["@types/node"] = "^24.19.2";
      expect(findPinViolations(input)).toEqual([]);
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
