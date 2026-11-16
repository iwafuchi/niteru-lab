import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const compose = readFileSync(path.join(import.meta.dirname, "../../compose.yaml"), "utf8");

// Floci は知らない環境変数を無視するため、行を消しても起動は失敗しない。
// 消えると cdk bootstrap のときに古いレジストリ（registry:2）のコンテナが起動する（docs/decisions/0003）
test("Floci の ECR を止めている", () => {
  expect(compose).toMatch(/^\s+FLOCI_SERVICES_ECR_ENABLED:\s*["']?false["']?\s*(?:#.*)?$/m);
});
