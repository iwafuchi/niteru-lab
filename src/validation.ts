import { z } from "zod";

// 入力の上限。形態素解析のコストと Lambda の実行時間を抑えるため
export const MAX_TEXT_LENGTH = 1000;

const TEXT_REQUIRED = "text は空でない文字列で指定してください";
const TEXT_TOO_LONG = `text は ${MAX_TEXT_LENGTH} 文字以内で指定してください`;

const tokenizeRequestSchema = z.object(
  {
    text: z
      .string({ error: TEXT_REQUIRED })
      .min(1, { error: TEXT_REQUIRED })
      .refine((text) => !exceedsGraphemes(text, MAX_TEXT_LENGTH), { error: TEXT_TOO_LONG }),
  },
  { error: TEXT_REQUIRED },
);

export type ParseResult = { ok: true; text: string } | { ok: false; error: string };

/** POST /tokenize のリクエストボディを検証する */
export function parseTokenizeRequest(body: unknown): ParseResult {
  const result = tokenizeRequestSchema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? TEXT_REQUIRED };
  }
  return { ok: true, text: result.data.text };
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
