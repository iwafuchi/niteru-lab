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
| 設計・技術選定の判断 | [docs/decisions/](docs/decisions/README.md)  |

## コマンド

mise が有効化されていないシェル（bash など）では、`~/.local/bin/mise exec --` を前に付けて実行する。

```bash
pnpm test        # unit + integration
pnpm lint        # 型情報を使う Lint
pnpm typecheck
pnpm format
pnpm dev         # ローカルで API を起動
```

## Claude Code が守ること

- **マージはユーザーが行う**。PR を作ったら CI の成功を確認して止まる
- 強制 push で履歴を書き換えない。PR の修正は追加のコミットで行う
- 「Step N」のような作業手順の番号は、コミットメッセージやコードのコメントに使わない
- 設計や技術選定で判断したことは `docs/decisions/` に記録する。判断を変えるときは既存の記録を確認し、新しい記録で置き換える

## コード

- TypeScript は型チェック専用（`noEmit`）。ビルドは esbuild（CDK）と tsx が行う
- `enum` や `namespace` は使わない（`erasableSyntaxOnly`）。型だけの import は `import type`
- 認証情報をコードやコミットメッセージに書かない。API キーは SSM Parameter Store、AWS の認証は OIDC
- API の仕様の正はテスト（`test/integration/app.test.ts`、`test/unit/validation.test.ts`）。入力検証の方針は [0001](docs/decisions/0001-input-validation.md)
