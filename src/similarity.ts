/**
 * 短いほうの読みがこの文字数未満なら、2-gram に加えて 1-gram も使う。
 * 2 文字以下の読みからは 2-gram が 1 つ以下しか作れず、
 * 1 文字の違いで類似度が 0 か 1 に振れてしまうため
 */
export const SHORT_READING_LENGTH = 3;

const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

/**
 * 正規化済みの読み（カタカナ）どうしの類似度を 0〜1 で返す。
 * 2-gram の Jaccard 係数を基本とし、短い読みでは 1-gram との平均をとる
 */
export function similarity(a: string, b: string): number {
  // 空の読みは比べようがないので、空どうしでも同一とはみなさない
  if (a === "" || b === "") return 0;
  if (a === b) return 1;

  const charsA = graphemes(a);
  const charsB = graphemes(b);
  const bigram = jaccard(ngrams(charsA, 2), ngrams(charsB, 2));

  if (Math.min(charsA.length, charsB.length) >= SHORT_READING_LENGTH) {
    return bigram;
  }
  const unigram = jaccard(ngrams(charsA, 1), ngrams(charsB, 1));
  return (unigram + bigram) / 2;
}

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

function ngrams(chars: string[], n: number): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i + n <= chars.length; i++) {
    result.add(chars.slice(i, i + n).join(""));
  }
  return result;
}

// 共通する要素の数 / どちらかにある要素の数。どちらも空なら 0
function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]).size;
  if (union === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  return intersection / union;
}
