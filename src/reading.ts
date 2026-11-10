import { normalize } from "./normalize";
import { similarity } from "./similarity";
import { tokenize } from "./tokenizer";

// ひらがな（ぁ〜ゖ）。カタカナとはコードポイントが 0x60 ずれている
const HIRAGANA = /[ぁ-ゖ]/g;

function toKatakana(text: string): string {
  return text.replace(HIRAGANA, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/**
 * 入力文を比較用の読み（カタカナ）にする。
 * 正規化してから形態素解析し、各形態素の読みをつなげる。
 * 辞書にない語は表層形が読みとして返るため、ひらがなはカタカナにそろえる
 */
export async function toReading(text: string): Promise<string> {
  const normalized = normalize(text);
  if (normalized === "") return "";
  const tokens = await tokenize(normalized);
  return toKatakana(tokens.map((t) => t.reading).join(""));
}

/** 2 つの文を読みに変換してから類似度を 0〜1 で返す */
export async function compareTexts(a: string, b: string): Promise<number> {
  const [readingA, readingB] = await Promise.all([toReading(a), toReading(b)]);
  return similarity(readingA, readingB);
}
