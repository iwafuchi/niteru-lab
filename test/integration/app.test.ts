import { describe, expect, test } from "vitest";
import { app } from "../../src/app";

// HTTP 層の振る舞い（ステータスコードとレスポンスの形）を確認する。
// 入力検証の細かい境界値は unit/validation.test.ts で確認する
describe("GET /health", () => {
  test("200 と { status: 'ok' } を返す", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("POST /tokenize", () => {
  test("200 と、入力文・読み全体・形態素の一覧を返す", async () => {
    const res = await postTokenize(JSON.stringify({ text: "夜に駆ける" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      text: "夜に駆ける",
      reading: "ヨルニカケル",
      tokens: [
        { surface: "夜", reading: "ヨル", pos: "名詞" },
        { surface: "に", reading: "ニ", pos: "助詞" },
        { surface: "駆ける", reading: "カケル", pos: "動詞" },
      ],
    });
  });

  test("JSON として解釈できないボディには 400 とエラーメッセージを返す", async () => {
    const res = await postTokenize("oops");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text は空でない文字列で指定してください" });
  });

  test("入力検証に失敗したら 400 とエラーメッセージを返す", async () => {
    const res = await postTokenize(JSON.stringify({ text: "あ".repeat(1001) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text は 1000 文字以内で指定してください" });
  });
});

describe("未定義のルート", () => {
  test("404 を返す", async () => {
    const res = await app.request("/unknown");
    expect(res.status).toBe(404);
  });
});

function postTokenize(body: string) {
  return app.request("/tokenize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
