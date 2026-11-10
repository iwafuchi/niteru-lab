# ドキュメント

このリポジトリの規約と、設計の判断の記録です。プロジェクトの概要とセットアップはルートの [README.md](../README.md) を参照してください。

## 規約

| ファイル                           | 内容                                                             |
| ---------------------------------- | ---------------------------------------------------------------- |
| [commit.md](commit.md)             | コミットメッセージ（Conventional Commits、本文に意思決定を書く） |
| [pull-request.md](pull-request.md) | ブランチと PR の流れ、`main` の保護                              |
| [testing.md](testing.md)           | テストピラミッドと、テストを仕様のガードとして書くためのルール   |
| [dependencies.md](dependencies.md) | 依存の追加・更新（Dependabot）、バージョンとチェックサムの固定   |

規約のうち機械で検査できるものは、設定ファイル（`commitlint.config.ts`、`.oxlintrc.json`、`lefthook.yml` など）と CI で検査しています。

## 設計の判断

[decisions/](decisions/) に、設計や技術選定の判断を 1 件 1 ファイルで記録しています。
