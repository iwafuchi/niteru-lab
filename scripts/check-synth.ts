// cdk synth の結果から、外部にデータを送らない設定が効いているかを検査する（pnpm synth の後に実行）。
// 設定（cdk.json）を読むのではなく結果を見るのは、設定の書き場所を誤っても気づけるようにするため
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const templateSchema = z.object({
  Resources: z.record(z.string(), z.looseObject({ Type: z.string() })).optional(),
});

const manifestSchema = z.object({
  artifacts: z
    .record(
      z.string(),
      z.looseObject({
        type: z.string(),
        properties: z
          .looseObject({
            templateFile: z.string().optional(),
            directoryName: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

/**
 * cdk.out の manifest.json から、検査するテンプレートと、入れ子のアセンブリ（Stage など）の
 * ディレクトリを返す。ディレクトリを直接見ないのは、以前の synth で残った古いテンプレートを
 * 対象にしないため
 */
export function templateFilesOf(manifest: unknown): {
  templateFiles: string[];
  nestedAssemblies: string[];
} {
  const artifacts = Object.values(manifestSchema.parse(manifest).artifacts ?? {});
  return {
    templateFiles: artifacts.flatMap((a) =>
      a.type === "aws:cloudformation:stack" && a.properties?.templateFile !== undefined
        ? [a.properties.templateFile]
        : [],
    ),
    nestedAssemblies: artifacts.flatMap((a) =>
      a.type === "cdk:cloud-assembly" && a.properties?.directoryName !== undefined
        ? [a.properties.directoryName]
        : [],
    ),
  };
}

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

function readTemplates(assemblyDir: string, prefix = ""): Record<string, unknown> {
  const manifest: unknown = JSON.parse(
    readFileSync(path.join(assemblyDir, "manifest.json"), "utf8"),
  );
  const { templateFiles, nestedAssemblies } = templateFilesOf(manifest);
  const templates: Record<string, unknown> = {};
  for (const file of templateFiles) {
    templates[prefix + file] = JSON.parse(readFileSync(path.join(assemblyDir, file), "utf8"));
  }
  for (const dir of nestedAssemblies) {
    Object.assign(templates, readTemplates(path.join(assemblyDir, dir), `${prefix}${dir}/`));
  }
  return templates;
}

function main(): void {
  const templates = readTemplates(path.join(import.meta.dirname, "..", "cdk.out"));
  // CDK の CLI は状態を標準エラー出力に書くため、両方をまとめて見る
  const status = spawnSync("cdk", ["cli-telemetry", "--status"], { encoding: "utf8" });
  if (status.error) throw status.error;
  if (status.status !== 0) {
    throw new Error(`cdk cli-telemetry --status が失敗しました:\n${status.stderr}`);
  }
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
