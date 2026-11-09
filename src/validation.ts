// 入力の上限。形態素解析のコストと Lambda の実行時間を抑えるため
export const MAX_TEXT_LENGTH = 1000;

export type ParseResult = { ok: true; text: string } | { ok: false; error: string };

/** POST /tokenize のリクエストボディを検証する */
export function parseTokenizeRequest(body: unknown): ParseResult {
  const text = isRecord(body) ? body.text : undefined;

  if (typeof text !== "string" || text.length === 0) {
    return { ok: false, error: "text は空でない文字列で指定してください" };
  }
  if (exceedsGraphemes(text, MAX_TEXT_LENGTH)) {
    return { ok: false, error: `text は ${MAX_TEXT_LENGTH} 文字以内で指定してください` };
  }
  return { ok: true, text };
}

const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

// 文字数は見た目の 1 文字（書記素）単位で数える。
// 巨大な入力を最後まで分割しないよう、上限を超えた時点で打ち切る
function exceedsGraphemes(text: string, max: number): boolean {
  const graphemes = segmenter.segment(text)[Symbol.iterator]();
  for (let i = 0; i <= max; i++) {
    if (graphemes.next().done) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
