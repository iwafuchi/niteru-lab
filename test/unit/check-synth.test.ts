import { describe, expect, test } from "vitest";
import { findSynthViolations, templateFilesOf } from "../../scripts/check-synth";

const TELEMETRY_DISABLED =
  "CLI Telemetry is disabled. See https://docs.aws.amazon.com/cdk/v2/guide/cli-telemetry.html for ways to enable.";
const TELEMETRY_ENABLED =
  "CLI Telemetry is enabled. See https://docs.aws.amazon.com/cdk/v2/guide/cli-telemetry.html for ways to disable.";

const lambdaOnly = {
  Resources: { ApiFunction: { Type: "AWS::Lambda::Function" } },
};
const withMetadata = {
  Resources: {
    ApiFunction: { Type: "AWS::Lambda::Function" },
    CDKMetadata: { Type: "AWS::CDK::Metadata", Properties: { Analytics: "v2:deflate64:..." } },
  },
};

describe("cdk synth の結果の検査（外部にデータを送らない設定が効いているか）", () => {
  test("テンプレートに利用状況の報告がなく、CLI のテレメトリーが無効なら違反はない", () => {
    expect(
      findSynthViolations({
        templates: { "NiteruLab-Local.template.json": lambdaOnly },
        telemetryStatus: TELEMETRY_DISABLED,
      }),
    ).toEqual([]);
  });

  test("テンプレートに AWS::CDK::Metadata（利用状況の報告）があれば違反になる", () => {
    expect(
      findSynthViolations({
        templates: { "NiteruLab-Local.template.json": withMetadata },
        telemetryStatus: TELEMETRY_DISABLED,
      }),
    ).toEqual([
      "NiteruLab-Local.template.json に AWS::CDK::Metadata がある（versionReporting が効いていない）",
    ]);
  });

  test("テンプレートが複数あれば、すべてを検査する", () => {
    expect(
      findSynthViolations({
        templates: { "A.template.json": lambdaOnly, "B.template.json": withMetadata },
        telemetryStatus: TELEMETRY_DISABLED,
      }),
    ).toEqual(["B.template.json に AWS::CDK::Metadata がある（versionReporting が効いていない）"]);
  });

  test("CLI のテレメトリーが有効なら違反になる", () => {
    expect(
      findSynthViolations({
        templates: { "NiteruLab-Local.template.json": lambdaOnly },
        telemetryStatus: TELEMETRY_ENABLED,
      }),
    ).toEqual(["CDK の CLI のテレメトリーが無効になっていない"]);
  });

  test("テンプレートが 1 つもなければ違反になる（synth が実行されていない）", () => {
    expect(findSynthViolations({ templates: {}, telemetryStatus: TELEMETRY_DISABLED })).toEqual([
      "cdk.out にテンプレートがない（cdk synth の後に実行する）",
    ]);
  });
});

describe("cdk.out の manifest.json から検査するテンプレートを決める", () => {
  test("スタックのテンプレートだけを対象にし、他の成果物は無視する", () => {
    expect(
      templateFilesOf({
        artifacts: {
          "NiteruLab-Local.assets": { type: "cdk:asset-manifest", properties: {} },
          "NiteruLab-Local": {
            type: "aws:cloudformation:stack",
            properties: { templateFile: "NiteruLab-Local.template.json" },
          },
          Tree: { type: "cdk:tree", properties: {} },
        },
      }),
    ).toEqual({ templateFiles: ["NiteruLab-Local.template.json"], nestedAssemblies: [] });
  });

  test("スタック以外の成果物は、templateFile を持っていても対象にしない", () => {
    expect(
      templateFilesOf({
        artifacts: {
          Other: { type: "cdk:asset-manifest", properties: { templateFile: "other.json" } },
        },
      }),
    ).toEqual({ templateFiles: [], nestedAssemblies: [] });
  });

  test("Stage などで入れ子になったアセンブリのディレクトリも返し、その中も検査できるようにする", () => {
    expect(
      templateFilesOf({
        artifacts: {
          "assembly-Dev": {
            type: "cdk:cloud-assembly",
            properties: { directoryName: "assembly-Dev" },
          },
        },
      }),
    ).toEqual({ templateFiles: [], nestedAssemblies: ["assembly-Dev"] });
  });
});
