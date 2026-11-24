import { describe, expect, test } from "vitest";
import {
  findContainerViolations,
  findLeftoverViolations,
  findResponseViolations,
  functionUrlOf,
  parseContainers,
} from "../../scripts/floci-smoke";

// docker ps と cdk deploy --outputs-file の実際の出力（Floci 2.5.0）
const LAMBDA = "floci-aws-NiteruLab-Local-ApiFunctionCE271BD4-61369d29d148-84f1b8f3";
const REGISTRY = "floci-aws-ecr-registry";
const FUNCTION_URL =
  "http://a3e378b0184f38ee9b394fab3322e036.lambda-url.ap-northeast-1.localhost:4566/";

describe("デプロイの出力から Function URL を取り出す", () => {
  test("スタックの出力の FunctionUrl を返す", () => {
    expect(functionUrlOf({ "NiteruLab-Local": { FunctionUrl: FUNCTION_URL } }).href).toBe(
      FUNCTION_URL,
    );
  });

  test.each([
    ["スタックがない", {}],
    ["FunctionUrl の出力がない", { "NiteruLab-Local": { Other: "x" } }],
    [
      "FunctionUrl が 2 つある",
      { A: { FunctionUrl: FUNCTION_URL }, B: { FunctionUrl: FUNCTION_URL } },
    ],
  ])("%sなら失敗する", (_label, outputs) => {
    expect(() => functionUrlOf(outputs)).toThrow("FunctionUrl が 1 つではない");
  });

  test.each([
    ["本物の AWS", "https://abc.lambda-url.ap-northeast-1.on.aws/"],
    ["localhost で終わるように見える別のホスト", "http://abc.evil-localhost:4566/"],
    ["https", FUNCTION_URL.replace("http:", "https:")],
    ["Floci と違うポート", "http://abc.lambda-url.ap-northeast-1.localhost:8080/"],
  ])("接続先が%sなら、リクエストを送らないよう失敗する", (_label, url) => {
    expect(() => functionUrlOf({ "NiteruLab-Local": { FunctionUrl: url } })).toThrow(
      "Floci の URL ではない",
    );
  });
});

describe("API の応答の検査", () => {
  const request = { method: "GET", path: "health" };
  const expected = { status: 200, body: { status: "ok" } };

  test("ステータスコードとボディが期待どおりなら違反はない", () => {
    const actual = { status: 200, body: { status: "ok" } };
    expect(findResponseViolations([{ request, expected, actual }])).toEqual([]);
  });

  test.each([
    ["ステータスコード", { status: 500, body: { status: "ok" } }],
    ["ボディ", { status: 200, body: { status: "ng" } }],
    ["ボディの項目の数", { status: 200, body: { status: "ok", extra: 1 } }],
  ])("%sが違えば違反になる", (_label, actual) => {
    expect(findResponseViolations([{ request, expected, actual }])).toEqual([
      `GET /health の応答が違う: 期待 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`,
    ]);
  });

  test("応答が 1 つもなければ違反になる（何も確かめずに成功しない）", () => {
    expect(findResponseViolations([])).toEqual(["API の応答を 1 つも確かめていない"]);
  });
});

describe("Floci が起動したコンテナの検査", () => {
  test("docker ps の出力から、名前とサービスを取り出す", () => {
    expect(parseContainers(`${LAMBDA}\tlambda\n${REGISTRY}\tecr\n`)).toEqual([
      { name: LAMBDA, service: "lambda" },
      { name: REGISTRY, service: "ecr" },
    ]);
  });

  test("出力が空ならコンテナはない", () => {
    expect(parseContainers("")).toEqual([]);
  });

  test("Lambda だけなら違反はない", () => {
    expect(findContainerViolations([{ name: LAMBDA, service: "lambda" }])).toEqual([]);
  });

  test("ECR のレジストリが起動していれば違反になる", () => {
    expect(
      findContainerViolations([
        { name: LAMBDA, service: "lambda" },
        { name: REGISTRY, service: "ecr" },
      ]),
    ).toEqual([`Floci が Lambda 以外のコンテナを起動した: ${REGISTRY}（ecr）`]);
  });

  test("サービスのラベルがないコンテナも違反になる", () => {
    expect(
      findContainerViolations([
        { name: LAMBDA, service: "lambda" },
        { name: "floci-unknown", service: "" },
      ]),
    ).toEqual(["Floci が Lambda 以外のコンテナを起動した: floci-unknown（ラベルなし）"]);
  });

  test("Lambda のコンテナが見つからなければ違反になる（ラベルの形が変わったら気づく）", () => {
    expect(findContainerViolations([])).toEqual(["Lambda のコンテナが見つからない"]);
  });
});

describe("停止した後に残ったものの検査", () => {
  test("何も残っていなければ違反はない", () => {
    expect(findLeftoverViolations({ containers: [], networks: [], volumes: [] })).toEqual([]);
  });

  test("コンテナ・ネットワーク・ボリュームが残っていれば、すべてを報告する", () => {
    expect(
      findLeftoverViolations({
        containers: [REGISTRY],
        networks: ["niteru-lab_default"],
        volumes: ["c7e2c79d"],
      }),
    ).toEqual([
      `停止した後にコンテナが残っている: ${REGISTRY}`,
      "停止した後にネットワークが残っている: niteru-lab_default",
      "停止した後にボリュームが残っている: c7e2c79d",
    ]);
  });
});
