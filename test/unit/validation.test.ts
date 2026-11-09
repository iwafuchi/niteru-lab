import { describe, expect, test } from "vitest";
import { MAX_TEXT_LENGTH, parseTokenizeRequest } from "../../src/validation";

describe("POST /tokenize の入力検証", () => {
  describe("受け付ける入力", () => {
    test("text に文字列を指定すると、その文字列をそのまま受け付ける", () => {
      expect(parseTokenizeRequest({ text: "夜に駆ける" })).toEqual({
        ok: true,
        text: "夜に駆ける",
      });
    });

    test("空白を含む文字列も加工せずに受け付ける（正規化は類似度判定側の責務）", () => {
      expect(parseTokenizeRequest({ text: "あ い" })).toEqual({ ok: true, text: "あ い" });
    });

    test(`${MAX_TEXT_LENGTH} 文字ちょうどは受け付ける`, () => {
      const text = "あ".repeat(MAX_TEXT_LENGTH);
      expect(parseTokenizeRequest({ text })).toEqual({ ok: true, text });
    });

    test.each([
      ["絵文字（サロゲートペア）", "🎵"],
      ["結合された絵文字（家族）", "👨‍👩‍👧"],
      ["濁点を結合文字で表した仮名", "が"],
    ])("文字数は見た目の 1 文字単位で数え、%sも 1 文字として扱う", (_label, char) => {
      const text = char.repeat(MAX_TEXT_LENGTH);
      expect(text.length).toBeGreaterThan(MAX_TEXT_LENGTH);
      expect(parseTokenizeRequest({ text })).toEqual({ ok: true, text });
      expect(parseTokenizeRequest({ text: text + char }).ok).toBe(false);
    });

    test("text 以外のプロパティは無視する", () => {
      expect(parseTokenizeRequest({ text: "あい", extra: 1 })).toEqual({ ok: true, text: "あい" });
    });
  });

  describe("拒否する入力", () => {
    test(`${MAX_TEXT_LENGTH + 1} 文字以上は拒否する`, () => {
      const result = parseTokenizeRequest({ text: "あ".repeat(MAX_TEXT_LENGTH + 1) });
      expect(result).toEqual({
        ok: false,
        error: `text は ${MAX_TEXT_LENGTH} 文字以内で指定してください`,
      });
    });

    test("空文字は拒否する", () => {
      expect(parseTokenizeRequest({ text: "" }).ok).toBe(false);
    });

    test.each([
      ["数値", 123],
      ["null", null],
      ["配列", ["あい"]],
      ["オブジェクト", { value: "あい" }],
    ])("text が%sなら拒否する", (_label, text) => {
      expect(parseTokenizeRequest({ text })).toEqual({
        ok: false,
        error: "text は空でない文字列で指定してください",
      });
    });

    test.each([
      ["undefined（JSON として解釈できない）", undefined],
      ["null", null],
      ["文字列", "あい"],
      ["配列", [{ text: "あい" }]],
      ["text のないオブジェクト", {}],
    ])("ボディが%sなら拒否する", (_label, body) => {
      expect(parseTokenizeRequest(body).ok).toBe(false);
    });
  });
});
