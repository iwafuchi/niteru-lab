// ローカル開発用のエントリポイント（pnpm dev）
import { serve } from "@hono/node-server";
import { app } from "./app";
import { loadTokenizer } from "./tokenizer";

const port = Number(process.env.PORT ?? 3000);

// 辞書の読み込み時間を測る。Lambda のコールドスタートを見積もる材料にする
const start = performance.now();
await loadTokenizer();
console.log(`kuromoji の辞書を読み込みました（${Math.round(performance.now() - start)}ms）`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`http://localhost:${info.port} で起動しました`);
});
