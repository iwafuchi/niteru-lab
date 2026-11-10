# CLAUDE.md

AWS CDK と GitHub Actions の学習用プロジェクト。概要は README.md を参照。
学習用途なので、一括で生成せず、ステップごとに説明しながら進める。

## コマンド

mise が有効化されていないシェル（bash など）では、`~/.local/bin/mise exec --` を前に付けて実行する。

```bash
pnpm test        # unit + integration
pnpm lint        # 型情報を使う Lint
pnpm typecheck
pnpm format
pnpm dev         # ローカルで API を起動
```

## 作業の流れ

- `main` はルールセットで保護されている。必ずブランチ（`feat/...`、`docs/...` など）で作業し、PR を経由する
- コミットは [CONTRIBUTING.md](CONTRIBUTING.md) に従う。Conventional Commits で、本文に理由・背景などの意思決定を書く。「Step N」のような作業手順の番号は使わない
- PR の本文は `.github/pull_request_template.md` の見出し（背景・変更内容・判断したこと・確認したこと）に沿って書く
- PR を作ったら CI の成功を確認する。**マージはユーザーが行う**
- 強制 push で履歴を書き換えない。PR の修正は追加のコミットで行う
- ワークフローの `uses:` を追加・変更したら `gh actions-lock` で `.github/workflows/actions.lock` を更新し、`gh actions-lock --verify` で確認する。lockfile は手で編集しない
- 依存パッケージはバージョンを固定して追加する（`pnpm add -E`）。ビルドスクリプトを持つパッケージは `pnpm-workspace.yaml` の `allowBuilds` で許可・拒否を明示する

## コード

- TypeScript は型チェック専用（`noEmit`）。ビルドは esbuild（CDK）と tsx が行う
- `enum` や `namespace` は使わない（`erasableSyntaxOnly`）。型だけの import は `import type`
- 認証情報をコードやコミットメッセージに書かない。API キーは SSM Parameter Store、AWS の認証は OIDC

## API

- 仕様の正はテスト：`test/integration/app.test.ts`（HTTP の振る舞い）、`test/unit/validation.test.ts`（入力の条件）。要約は README の「API」節
- OpenAPI の仕様書は作らない。利用者は IAM 認証の非公開 Function URL を呼ぶ CLI と e2e テストだけで、仕様書を読む人やツールがいないため
- 入力検証は zod のスキーマで書く。`@hono/zod-validator` は使わない（得られる型付けは Hono 組み込みの `validator()` でも得られ、依存を増やす理由がない）
  - ボディを持つエンドポイントを追加するときは、組み込みの `validator()` に移る。その際、content-type が JSON でないリクエストと壊れた JSON の扱い、`onError` で返すエラーの形を先にテストで決める
  - 見直すきっかけ：TypeScript のクライアントから Hono RPC で呼ぶ、OpenAPI が必要になる、ボディを持つエンドポイントが 3 つ以上になる

## テスト

[test/README.md](test/README.md) に従う。

- テストは仕様のガード。テスト名は「何を入力すると、どうなるか」を日本語の文章で書く
- 境界値の多いロジックは純粋な関数に切り出して `test/unit/` で網羅し、`test/integration/` では代表的なケースだけを確認する
- 仕様を変えるときは、先にテストを変える
- 新しいテストを書いたら、実装をわざと壊して失敗することを確かめる
