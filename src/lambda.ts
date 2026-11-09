// AWS Lambda 用のエントリポイント（CDK の NodejsFunction からデプロイする）
import { handle } from "hono/aws-lambda";
import { app } from "./app";
import { loadTokenizer } from "./tokenizer";

// 辞書の読み込みを Lambda の初期化フェーズで済ませ、最初のリクエストを待たせない
await loadTokenizer();

export const handler = handle(app);
