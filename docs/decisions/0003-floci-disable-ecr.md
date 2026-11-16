# 0003. Floci の ECR を止める

- 状態：採用
- 日付：2026-11-16

## 背景

Floci は ECR を再現するために、レジストリのコンテナを自分で起動する。2.4.0 では、そのイメージが標準で `registry:2` になっている（2023 年 10 月作成、Distribution 2.x 系）。main ブランチでも標準の値は変わっていない。

`pnpm cdk:local bootstrap` を実行すると、CDK の bootstrap のスタックが ECR のリポジトリを作るため、このコンテナ（`floci-aws-ecr-registry`）が `127.0.0.1:5100` で起動する。`compose.yaml` には書いていないため、Dependabot の更新の対象にも、`pnpm check:pins` の検査の対象にもならず、古いまま使われ続ける。

## 判断

`compose.yaml` で `FLOCI_SERVICES_ECR_ENABLED: "false"` を指定し、Floci の ECR を止める。

このアプリの Lambda は zip でデプロイしていて、コンテナイメージを使わない。ECR を止めた状態で、bootstrap、deploy、Function URL の `/health` と `/tokenize` の応答を確かめた（Floci 2.4.0）。レジストリのコンテナは起動しなかった。

使わない機能は動かさない。古いイメージを更新し続ける手間もなくなる。

## 検討した案

### レジストリのイメージを registry:3 に差し替える

- `FLOCI_SERVICES_ECR_REGISTRY_IMAGE` に `registry:3.x@sha256:...` を指定する
- 採用しない理由：使わないコンテナを動かし続けることになる。また、環境変数に書いたイメージは Dependabot が更新しない。Dependabot が書き換えるのは `services.<name>.image` だけで、YAML のアンカーで `image:` と環境変数に同じ値を使う方法も、Dependabot の書き換え用の正規表現に合わなくなる。そのため手動で更新することになる

## 見直すきっかけ

- コンテナイメージの Lambda や ECS など、ECR を使う構成を試す。そのときは、レジストリのイメージを digest で固定して指定する
- Floci の標準のレジストリのイメージが更新される、または ECR を止めたことで bootstrap や deploy が失敗するようになる
