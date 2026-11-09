# e2e テスト

デプロイ済みの Dev 環境（Lambda Function URL）に対して実行するテストを置きます。
CDK で Dev 環境をデプロイした後に追加します。

- 実行には AWS の認証情報が必要です（Function URL は IAM 認証のため）
- `pnpm test` では実行されません。`pnpm test:e2e` で明示的に実行します
