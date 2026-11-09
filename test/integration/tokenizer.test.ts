import { beforeAll, describe, expect, test, vi } from "vitest";
import { loadTokenizer, tokenize } from "../../src/tokenizer";

describe("形態素解析（kuromoji の辞書を使用）", () => {
  beforeAll(async () => {
    await loadTokenizer();
  });

  test("入力文を形態素に分け、それぞれの読みをカタカナで返す", async () => {
    expect(await tokenize("夜に駆ける")).toEqual([
      { surface: "夜", reading: "ヨル", pos: "名詞" },
      { surface: "に", reading: "ニ", pos: "助詞" },
      { surface: "駆ける", reading: "カケル", pos: "動詞" },
    ]);
  });

  test.each(["夜に駆ける", "あ い", "Honoで遊ぶ！", "１２３ＡＢＣ"])(
    "表層形をつなげると入力文に戻る（文字を落とさない）: %s",
    async (text) => {
      const tokens = await tokenize(text);
      expect(tokens.map((t) => t.surface).join("")).toBe(text);
    },
  );

  test("辞書にない語は表層形をそのまま読みとして使う", async () => {
    const tokens = await tokenize("Honoで遊ぶ");
    expect(tokens[0]).toEqual({ surface: "Hono", reading: "Hono", pos: "名詞" });
  });
});

describe("辞書の読み込み", () => {
  test("辞書の読み込みはプロセス内で一度だけ行い、同じ Tokenizer を使い回す", async () => {
    const fresh = await importFresh();
    expect(fresh.loadTokenizer()).toBe(fresh.loadTokenizer());
  });

  test("読み込みに失敗しても、次の呼び出しで再試行できる", async () => {
    const fresh = await importFresh();
    await expect(fresh.loadTokenizer("/nonexistent/dict")).rejects.toThrow(
      "no such file or directory",
    );
    await expect(fresh.loadTokenizer()).resolves.toBeDefined();
  });
});

// モジュール内のキャッシュを他のテストと共有しないよう、読み込み直す
async function importFresh() {
  vi.resetModules();
  return import("../../src/tokenizer");
}
