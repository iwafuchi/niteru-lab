# CLAUDE.md

AWS CDK と GitHub Actions の学習用プロジェクト。概要は README.md を参照。
学習用途なので、一括で生成せず、ステップごとに説明しながら進める。

規約は [docs/](docs/README.md) にまとめてある。作業の前に該当する規約を読む。

| 作業                 | 規約                                         |
| -------------------- | -------------------------------------------- |
| コミット             | [docs/commit.md](docs/commit.md)             |
| ブランチ・PR         | [docs/pull-request.md](docs/pull-request.md) |
| テスト               | [docs/testing.md](docs/testing.md)           |
| 依存の追加・更新     | [docs/dependencies.md](docs/dependencies.md) |
| Dependabot の PR     | [docs/dependabot.md](docs/dependabot.md)     |
| 設計・技術選定の判断 | [docs/decisions/](docs/decisions/README.md)  |
| PR を作る前の確認    | [docs/review.md](docs/review.md)             |

## コマンド

mise が有効化されていないシェル（bash など）では、`~/.local/bin/mise exec --` を前に付けて実行する。

```bash
pnpm check       # 整形の確認・Lint（コード、シェル、リンク）・型チェック・依存の固定・テスト・cdk synth（と結果の検査）をまとめて実行
pnpm test        # unit + integration
pnpm lint        # 型情報を使う Lint
pnpm typecheck
pnpm format
pnpm dev         # ローカルで API を起動
pnpm floci:up    # ローカルの AWS エミュレーター（Floci）を起動。止めるときは floci:down
pnpm floci:smoke # Floci での動作確認（起動、デプロイ、API の応答、余計なコンテナがないこと、停止）
pnpm cdk:local deploy  # CDK を Floci に向けて実行（本物の AWS には向かない）
```

## 作業のループ

PR を作る前に、指摘がなくなるまで次を繰り返す（詳しくは [docs/review.md](docs/review.md)）。

1. `pnpm check` を実行する。失敗したら直して、もう一度実行する
2. 差分全体（`git diff main...HEAD` と、未コミットの `git diff HEAD`）を docs/review.md の観点表で読み直し、code-review スキル（`/code-review`）で不具合を探す
3. 指摘があれば直して 1 に戻る。なければ PR を作り、「確認したこと」に `pnpm check` の結果とセルフレビューで直したことを書く

## Claude Code が守ること

- **マージはユーザーが行う**。PR を作ったら CI の成功を確認して止まる
- 強制 push で履歴を書き換えない。PR の修正は追加のコミットで行う
- 「Step N」のような作業手順の番号は、コミットメッセージやコードのコメントに使わない
- 設計や技術選定で判断したことは `docs/decisions/` に記録する。判断を変えるときは既存の記録を確認し、新しい記録で置き換える

## コード

- TypeScript は型チェック専用（`noEmit`）。ビルドは esbuild（CDK）と tsx が行う
- シェルスクリプトには拡張子 `.sh` を付ける（`pnpm lint:shell` が git で管理している `*.sh` を shellcheck で検査するため）
- `enum` や `namespace` は使わない（`erasableSyntaxOnly`）。型だけの import は `import type`
- 認証情報と AWS のアカウント ID をコード・コミットメッセージ・PR の本文に書かない。API キーは SSM Parameter Store、AWS の認証は OIDC。本物のアカウント ID は gitleaks（`.gitleaks.toml`）が検出する
- API の仕様の正はテスト（`test/integration/app.test.ts`、`test/unit/validation.test.ts`）。入力検証の方針は [0001](docs/decisions/0001-input-validation.md)
