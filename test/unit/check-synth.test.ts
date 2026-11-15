import { describe, expect, test } from "vitest";
import { findSynthViolations } from "../../scripts/check-synth";

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
