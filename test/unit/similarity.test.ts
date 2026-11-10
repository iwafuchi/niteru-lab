import { describe, expect, test } from "vitest";
import { SHORT_READING_LENGTH, similarity } from "../../src/similarity";

// similarity は正規化済みの読み（カタカナ）どうしを比べる
describe("読みの類似度", () => {
  describe("基本の性質", () => {
    test.each(["ア", "アイ", "ヨルニカケル"])("同じ読みどうしは 1 になる: %s", (reading) => {
      expect(similarity(reading, reading)).toBe(1);
    });

    test("共通する文字がない読みどうしは 0 になる", () => {
      expect(similarity("ヨルニカケル", "サクラサク")).toBe(0);
    });

    test.each([
      ["", ""],
      ["", "アイ"],
      ["アイ", ""],
    ])("どちらかが空なら 0 になる（空どうしも同一とはみなさない）: %j と %j", (a, b) => {
      expect(similarity(a, b)).toBe(0);
    });

    test.each([
      ["ヨルニカケル", "ヨルニカケテ"],
      ["アイ", "アイウ"],
      ["ア", "アイウエオ"],
    ])("比べる順番を入れ替えても同じ値になる: %s と %s", (a, b) => {
      expect(similarity(a, b)).toBe(similarity(b, a));
    });
  });

  describe(`${SHORT_READING_LENGTH} 文字以上の読みは 2-gram の Jaccard 係数で比べる`, () => {
    test("一部が異なる読みは、共通する 2-gram の割合になる", () => {
      // ヨル・ルニ・ニカ・カケ・ケル と ヨル・ルニ・ニカ・カケ・ケテ → 共通 4 / 全体 6
      expect(similarity("ヨルニカケル", "ヨルニカケテ")).toBeCloseTo(4 / 6);
    });

    test("文字が同じでも並び順が違えば低くなる（1-gram は使わない）", () => {
      // アイ・イウ と ウイ・イア → 共通なし
      expect(similarity("アイウ", "ウイア")).toBe(0);
    });
  });

  describe(`短いほうの読みが ${SHORT_READING_LENGTH} 文字未満なら 1-gram と 2-gram の平均で比べる`, () => {
    test("2 文字どうしで並び順だけが違う場合は 0.5 になる", () => {
      // 1-gram：{ア, イ} と {イ, ア} → 1、2-gram：{アイ} と {イア} → 0
      expect(similarity("アイ", "イア")).toBe(0.5);
    });

    test("短い読みと長い読みを比べるときも、短いほうの長さで判断する", () => {
      // 1-gram：{ア, イ} と {ア, イ, ウ} → 2/3、2-gram：{アイ} と {アイ, イウ} → 1/2
      expect(similarity("アイ", "アイウ")).toBeCloseTo((2 / 3 + 1 / 2) / 2);
    });

    test("1 文字どうしで異なる場合は 0 になる", () => {
      expect(similarity("ア", "イ")).toBe(0);
    });
  });

  test.each([
    ["ア", "アア"],
    ["アイ", "アイアイ"],
    ["ヨルニカケル", "ヨル"],
    ["ラララ", "ラ"],
  ])("値は常に 0 以上 1 以下になる: %s と %s", (a, b) => {
    const score = similarity(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
