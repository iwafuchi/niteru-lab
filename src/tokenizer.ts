import { createRequire } from "node:module";
import path from "node:path";
import kuromoji from "kuromoji";

export type Token = {
  /** 表層形（入力文に現れた文字列） */
  surface: string;
  /** 読み（カタカナ）。辞書にない語は表層形をそのまま使う */
  reading: string;
  /** 品詞 */
  pos: string;
};

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

const require = createRequire(import.meta.url);

// kuromoji パッケージに同梱されている辞書（約 18MB）の場所
function defaultDicPath(): string {
  return path.join(path.dirname(require.resolve("kuromoji/package.json")), "dict");
}

// 辞書の読み込みは重いので、プロセス内で一度だけ行い使い回す
let tokenizerPromise: Promise<Tokenizer> | undefined;

export function loadTokenizer(
  dicPath = process.env.KUROMOJI_DIC_PATH ?? defaultDicPath(),
): Promise<Tokenizer> {
  tokenizerPromise ??= new Promise<Tokenizer>((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  }).catch((error: unknown) => {
    // 失敗した Promise をキャッシュし続けないよう、次の呼び出しで再試行させる
    tokenizerPromise = undefined;
    throw error;
  });
  return tokenizerPromise;
}

export async function tokenize(text: string): Promise<Token[]> {
  const tokenizer = await loadTokenizer();
  return tokenizer.tokenize(text).map((t) => ({
    surface: t.surface_form,
    reading: t.reading ?? t.surface_form,
    pos: t.pos,
  }));
}
