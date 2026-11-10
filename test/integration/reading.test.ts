import { describe, expect, test } from "vitest";
import { compareTexts, toReading } from "../../src/reading";

describe("読みへの変換（正規化 → 形態素解析 → カタカナ）", () => {
  test("漢字かな交じりの文を、読みのカタカナにする", async () => {
    expect(await toReading("夜に駆ける")).toBe("ヨルニカケル");
  });

  test.each(["あ い", "あい", "アイ", "ｱｲ", "「あい」！"])(
    "空白・記号・半角などの表記の違いは同じ読みになる: %j",
    async (text) => {
      expect(await toReading(text)).toBe("アイ");
    },
  );

  test("辞書にないひらがなの語も、カタカナにそろえる", async () => {
    // 「ぴえん」は辞書になく、形態素解析では表記のまま返る
    expect(await toReading("ぴえん")).toBe("ピエン");
  });

  test("辞書にない語の英字は小文字のまま残す", async () => {
    expect(await toReading("Honoで遊ぶ")).toBe("honoデアソブ");
  });

  test("空白や記号だけの入力は空になる", async () => {
    expect(await toReading("　！？")).toBe("");
  });
});

describe("2 つの文の類似度", () => {
  test("表記が違っても、読みが同じなら 1 になる", async () => {
    expect(await compareTexts("夜に駆ける", "よるにかける")).toBe(1);
  });

  test("空白の有無だけが違う短い入力は 1 になる", async () => {
    expect(await compareTexts("あ い", "あい")).toBe(1);
  });

  test("一部だけが同じ文は、0 と 1 の間になる", async () => {
    const score = await compareTexts("夜に駆ける", "夜に眠る");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});
