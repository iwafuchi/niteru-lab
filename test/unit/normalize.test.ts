import { describe, expect, test } from "vitest";
import { normalize } from "../../src/normalize";

describe("正規化", () => {
  describe("空白を取り除く", () => {
    test.each([
      ["半角スペース", "あ い", "あい"],
      ["全角スペース", "あ　い", "あい"],
      ["タブと改行", "あ\tい\nう\r\nえ", "あいうえ"],
      ["前後の空白", "  あい  ", "あい"],
    ])("%sを取り除き、空白の有無による違いをなくす", (_label, input, expected) => {
      expect(normalize(input)).toBe(expected);
    });
  });

  describe("記号を取り除く", () => {
    test.each([
      ["句読点・感嘆符", "あ、い。う！え？", "あいうえ"],
      ["かぎ括弧", "「夜に駆ける」", "夜に駆ける"],
      ["中黒と波ダッシュ", "あ・い〜う", "あいう"],
      ["音符や絵文字", "あい♪🎵", "あい"],
    ])("%sを取り除く", (_label, input, expected) => {
      expect(normalize(input)).toBe(expected);
    });

    test.each([
      ["異体字セレクタ付きの絵文字", "あ❤️", "あ"],
      ["囲み記号付きの絵文字", "あ#️⃣", "あ"],
    ])("%sは、見た目を変えるための文字ごと取り除く", (_label, input, expected) => {
      expect(normalize(input)).toBe(expected);
    });

    test("長音記号（ー）は読みの一部なので残す", () => {
      expect(normalize("ラーメン")).toBe("ラーメン");
    });
  });

  describe("表記ゆれをそろえる（NFKC）", () => {
    test.each([
      ["全角英数字を半角に", "ＡＢＣ１２３", "abc123"],
      ["半角カタカナを全角に", "ｱｲｳｴｵ", "アイウエオ"],
      ["半角カタカナの濁点を合成する", "ｶﾞｷﾞ", "ガギ"],
      ["結合文字の濁点を合成する", "が", "が"],
    ])("%sする", (_label, input, expected) => {
      expect(normalize(input)).toBe(expected);
    });

    test("英字は小文字にそろえる", () => {
      expect(normalize("LOVE Love love")).toBe("lovelovelove");
    });
  });

  describe("変えないもの", () => {
    test("ひらがな・カタカナ・漢字は区別したまま残す（読みへの変換は別の処理）", () => {
      expect(normalize("あいアイ愛")).toBe("あいアイ愛");
    });
  });

  describe("空になる入力", () => {
    test.each([" ", "！？", "　\n\t", "🎵♪", "「」", "❤️"])(
      "空白や記号だけの入力は空文字になる: %j",
      (input) => {
        expect(normalize(input)).toBe("");
      },
    );
  });
});
