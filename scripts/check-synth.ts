// cdk synth の結果から、外部にデータを送らない設定が効いているかを検査する（pnpm synth の後に実行）。
// 設定（cdk.json）を読むのではなく結果を見るのは、設定の書き場所を誤っても気づけるようにするため
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const templateSchema = z.object({
  Resources: z.record(z.string(), z.looseObject({ Type: z.string() })).optional(),
});

export function findSynthViolations(input: {
  templates: Record<string, unknown>;
  telemetryStatus: string;
}): string[] {
  const violations: string[] = [];
  const files = Object.keys(input.templates);

  if (files.length === 0) {
    violations.push("cdk.out にテンプレートがない（cdk synth の後に実行する）");
  }
  for (const file of files) {
    const resources = templateSchema.parse(input.templates[file]).Resources ?? {};
    if (Object.values(resources).some((r) => r.Type === "AWS::CDK::Metadata")) {
      violations.push(`${file} に AWS::CDK::Metadata がある（versionReporting が効いていない）`);
    }
  }

  if (!input.telemetryStatus.includes("Telemetry is disabled")) {
    violations.push("CDK の CLI のテレメトリーが無効になっていない");
  }

  return violations;
}

function main(): void {
  const outDir = path.join(import.meta.dirname, "..", "cdk.out");
  const templates = Object.fromEntries(
    readdirSync(outDir)
      .filter((file) => file.endsWith(".template.json"))
      .map((file): [string, unknown] => [
        file,
        JSON.parse(readFileSync(path.join(outDir, file), "utf8")),
      ]),
  );
  // CDK の CLI は状態を標準エラー出力に書くため、両方をまとめて見る
  const status = spawnSync("cdk", ["cli-telemetry", "--status"], { encoding: "utf8" });
  if (status.error) throw status.error;
  const telemetryStatus = `${status.stdout}${status.stderr}`;

  const violations = findSynthViolations({ templates, telemetryStatus });
  if (violations.length > 0) {
    console.error(
      ["cdk synth の結果に違反があります:", ...violations.map((v) => `- ${v}`)].join("\n"),
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
