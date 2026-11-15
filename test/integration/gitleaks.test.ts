import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "zod";

const CONFIG = path.join(import.meta.dirname, "../../.gitleaks.toml");

// 本物らしいアカウント ID やキーをファイルに直接書くと、このファイル自体が gitleaks に
// 検出されるため、実行時に組み立てる
const ACCOUNT_ID = ["1234", "5678", "9012"].join("");
const ACCESS_KEY_ID = ["AKIA", "Z3MSJV4WWNKWW5FG"].join("");
// Floci のダミーのアカウント（本物ではないので検出しない）
const LOCAL_ACCOUNT_ID = "000000000000";

const reportSchema = z.array(z.looseObject({ RuleID: z.string() }));

/** gitleaks に文字列を渡し、検出したルールの ID を返す */
function scan(text: string): string[] {
  const result = spawnSync(
    "gitleaks",
    [
      "stdin",
      "--config",
      CONFIG,
      "--no-banner",
      "--log-level",
      "error",
      "--report-format",
      "json",
      "--report-path",
      "-",
    ],
    { input: text, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  // 何も検出しなければ終了コード 0、検出すれば 1。それ以外は設定の誤りなど
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`gitleaks が失敗しました（${result.status}）:\n${result.stderr}`);
  }
  return reportSchema.parse(JSON.parse(result.stdout || "[]")).map((f) => f.RuleID);
}

describe("gitleaks で AWS のアカウント ID を検出する", () => {
  describe("検出する", () => {
    test.each([
      ["ARN の中", `arn:aws:iam::${ACCOUNT_ID}:role/deployer`],
      ["CDK の env", `env: { account: "${ACCOUNT_ID}", region: "ap-northeast-1" }`],
      ["環境変数", `AWS_ACCOUNT_ID=${ACCOUNT_ID}`],
      ["JSON のキー", `{ "accountId": "${ACCOUNT_ID}" }`],
      ["cdk bootstrap の環境指定", `cdk bootstrap aws://${ACCOUNT_ID}/ap-northeast-1`],
    ])("%sのアカウント ID", (_label, text) => {
      expect(scan(text)).toEqual(["aws-account-id"]);
    });
  });

  describe("検出しない", () => {
    test.each([
      ["ARN の中", `arn:aws:iam::${LOCAL_ACCOUNT_ID}:role/deployer`],
      ["CDK の env", `env: { account: "${LOCAL_ACCOUNT_ID}", region: "ap-northeast-1" }`],
      ["cdk bootstrap の環境指定", `cdk bootstrap aws://${LOCAL_ACCOUNT_ID}/ap-northeast-1`],
    ])("Floci のダミーのアカウント（%s）", (_label, text) => {
      expect(scan(text)).toEqual([]);
    });

    test.each([
      ["アカウントと関係のない 12 桁の数字", `timestamp: ${ACCOUNT_ID}`],
      ["account の近くにある 13 桁の数字", `account: "${ACCOUNT_ID}3"`],
      ["account の近くにある 11 桁の数字", `account: "${ACCOUNT_ID.slice(1)}"`],
    ])("%s", (_label, text) => {
      expect(scan(text)).toEqual([]);
    });
  });

  test("gitleaks の標準のルールも引き続き使う（アクセスキー ID を検出する）", () => {
    expect(scan(`aws_access_key_id = ${ACCESS_KEY_ID}`)).toContain("aws-access-token");
  });
});
