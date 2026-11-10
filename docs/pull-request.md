# ブランチと Pull Request

## 流れ

1. `main` からブランチを作る。名前は `<type>/<内容>`（例：`feat/normalize`、`docs/reorganize`）。type は [commit.md](commit.md) と同じ
2. [commit.md](commit.md) に従ってコミットする
3. push して PR を作る。本文は [テンプレート](../.github/pull_request_template.md) の見出し（概要・背景・変更内容・判断したこと・確認したこと）に沿って書く。概要は、本文を読まなくても何が変わるか分かるよう 1〜3 行にまとめる
4. CI の成功を確認する
5. **マージはリポジトリの持ち主が行う**（Claude Code はマージしない）
6. マージ後、手元の `main` を最新にし、マージ済みのブランチを削除する

## main の保護

`main` は GitHub のルールセットで保護されています。

- 変更は PR 経由のみ（直接 push は不可）
- CI の 3 ジョブ（Lint / Format / Typecheck / Test、Secret scan、Commit messages）の成功が必須。PR のブランチが `main` の最新の状態を取り込んでいることも必須
- 強制 push と削除は禁止、履歴は一直線に保つ
- マージ方法は **rebase のみ**。コミットごとに書いた理由を残すため、squash は使わない
- マージ後にブランチは自動で削除される

## PR の修正

- レビューや CI の結果を受けた修正は、**追加のコミット**で行う
- 強制 push で履歴を書き換えない（push 済みのコミットメッセージに誤りがあった場合は、後のコミットメッセージや PR の本文で訂正する）
