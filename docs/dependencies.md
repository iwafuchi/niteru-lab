# 依存関係

## 追加するとき

- npm パッケージはバージョンを固定して追加する。[pnpm-workspace.yaml](../pnpm-workspace.yaml) の `saveExact: true` により、`pnpm add` は `^` や `~` を付けずに書き込む
- 公開から 7 日たっていないバージョンは、`minimumReleaseAge` により pnpm が選ばない（間接的な依存も含む）。pnpm はインストールのたびに lockfile もこの条件で検証するため、CI の `pnpm install --frozen-lockfile` でも違反は止まる。どうしても新しい版が必要なら、理由を書いて `minimumReleaseAgeExclude` に加える
- 完全に固定しない例外（今は `@types/node` だけ）は、[scripts/check-pins.ts](../scripts/check-pins.ts) の `RANGE_ALLOWED` に理由と一緒に書く
- インストール時にスクリプトを実行するパッケージ（postinstall など）は、pnpm が標準でブロックする。必要かどうかを判断し、[pnpm-workspace.yaml](../pnpm-workspace.yaml) の `allowBuilds` で許可・拒否を明示する
- mise で入れるツールは、`mise.toml` に書いてから `mise lock --platform linux-x64` でチェックサムを記録する（`locked = true` のため、`mise use` ではロックにないツールを入れられない）。配布物は WSL（glibc 2.35）でも動くものを選ぶ（例：lychee は musl 版）。`mise.lock` と lychee の `asset_pattern` は linux-x64 だけを前提にしているため、ARM の環境（Apple Silicon、arm64 の CI）で動かすなら両方を見直す
- ワークフローの `uses:` を追加・変更したら `gh actions-lock` で `.github/workflows/actions.lock` を更新し、`gh actions-lock --verify` で確認する。lockfile は手で編集しない

## 更新（Dependabot）

npm パッケージ、GitHub Actions、`compose.yaml` の Docker イメージは Dependabot が毎週月曜に更新の PR を作ります（設定は [.github/dependabot.yml](../.github/dependabot.yml)）。

- 公開から 7 日以内のバージョンは避ける（`cooldown`）。乗っ取られたパッケージは短期間で取り下げられることが多いため
- マイナー・パッチ更新は 1 つの PR にまとめ、メジャー更新はパッケージごとに個別の PR になる
- コミットメッセージは `build(deps): bump ...` / `ci(deps): bump ...` の形式で自動生成されます。body には更新内容（リリースノートへのリンクなど）が入るので、そのまま受け入れます
- マージする前に、CI の成功とリリースノートの破壊的変更を確認します。とくにメジャー更新と、0.x のパッケージ（oxfmt など）の更新に注意します
- Dependabot の cooldown は更新する依存そのものにだけ効く。間接的な依存が公開 7 日以内の版に解決されると、CI の `pnpm install --frozen-lockfile` が `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` で失敗する。その場合は `minimumReleaseAgeExclude` で回避せず、7 日たってから Dependabot に作り直させる（PR の `@dependabot recreate`）
- `mise.toml` のツール（Node.js・pnpm・gitleaks・shellcheck・lychee）は Dependabot の対象外です。手動で更新します

## バージョンとチェックサムの固定

`pnpm check`（`pnpm check:pins`）が、package.json の依存が完全に固定されていること、`packageManager` に sha512 があること、`compose.yaml` のイメージに digest があることを検査します。

取得するものはすべて、バージョンに加えてチェックサム（またはコミット SHA）で固定します。
同じバージョン番号のまま中身が差し替えられる攻撃を防ぐためです。

| 対象                                        | 固定する場所                                     | 更新の方法                                                                                                             |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| npm パッケージ                              | `pnpm-lock.yaml`（integrity）                    | Dependabot、または `pnpm add -E`                                                                                       |
| pnpm 本体                                   | `package.json` の `packageManager`（`+sha512.`） | 新しいバージョンの tarball の sha512 に書き換える                                                                      |
| Node.js・pnpm・gitleaks・shellcheck・lychee | `mise.lock`（`mise.toml` で `locked = true`）    | `mise.toml` の範囲内なら `mise lock <tool> --bump --platform linux-x64`。範囲を変えるなら先に `mise.toml` を書き換える |
| mise 本体（CI）                             | `ci.yml` の `version` と `sha256`                | リリースの `SHASUMS256.txt` から `linux-x64` のバイナリの値を写す                                                      |
| GitHub Actions                              | `.github/workflows/actions.lock`（コミット SHA） | Dependabot（lockfile も同じ PR で更新される）。ワークフローに Action を追加したら `gh actions-lock`                    |
| Floci（ローカルの AWS エミュレーター）      | `compose.yaml` の `image`（タグと digest）       | Dependabot（`docker-compose`）                                                                                         |
