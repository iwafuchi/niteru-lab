# 依存関係

## 追加するとき

- npm パッケージはバージョンを固定して追加する（`pnpm add -E`）。`^` や `~` は付けない
- インストール時にスクリプトを実行するパッケージ（postinstall など）は、pnpm が標準でブロックする。必要かどうかを判断し、[pnpm-workspace.yaml](../pnpm-workspace.yaml) の `allowBuilds` で許可・拒否を明示する
- ワークフローの `uses:` を追加・変更したら `gh actions-lock` で `.github/workflows/actions.lock` を更新し、`gh actions-lock --verify` で確認する。lockfile は手で編集しない

## 更新（Dependabot）

npm パッケージと GitHub Actions は Dependabot が毎週月曜に更新の PR を作ります（設定は [.github/dependabot.yml](../.github/dependabot.yml)）。

- 公開から 7 日以内のバージョンは避ける（`cooldown`）。乗っ取られたパッケージは短期間で取り下げられることが多いため
- マイナー・パッチ更新は 1 つの PR にまとめ、メジャー更新はパッケージごとに個別の PR になる
- コミットメッセージは `build(deps): bump ...` / `ci(deps): bump ...` の形式で自動生成されます。body には更新内容（リリースノートへのリンクなど）が入るので、そのまま受け入れます
- マージする前に、CI の成功とリリースノートの破壊的変更を確認します。とくにメジャー更新と、0.x のパッケージ（oxfmt など）の更新に注意します
- `mise.toml` のツール（Node.js・pnpm・gitleaks）は Dependabot の対象外です。手動で更新します

## バージョンとチェックサムの固定

取得するものはすべて、バージョンに加えてチェックサム（またはコミット SHA）で固定します。
同じバージョン番号のまま中身が差し替えられる攻撃を防ぐためです。

| 対象                    | 固定する場所                                     | 更新の方法                                                                                          |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| npm パッケージ          | `pnpm-lock.yaml`（integrity）                    | Dependabot、または `pnpm add -E`                                                                    |
| pnpm 本体               | `package.json` の `packageManager`（`+sha512.`） | 新しいバージョンの tarball の sha512 に書き換える                                                   |
| Node.js・pnpm・gitleaks | `mise.lock`（`mise.toml` で `locked = true`）    | `mise lock <tool>@<version>`                                                                        |
| mise 本体（CI）         | `ci.yml` の `version` と `sha256`                | リリースの `SHASUMS256.txt` から `linux-x64` のバイナリの値を写す                                   |
| GitHub Actions          | `.github/workflows/actions.lock`（コミット SHA） | Dependabot（lockfile も同じ PR で更新される）。ワークフローに Action を追加したら `gh actions-lock` |
