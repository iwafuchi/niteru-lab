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

## 注意点

- Floci は知らない環境変数を無視する。この行を消しても Floci は起動するので、`test/integration/compose.test.ts` で指定が残っていることを確かめる。ただし、Floci の更新で設定の名前が変わった場合は、このテストでは気づけない。Floci を更新したら、bootstrap の後に `floci-aws-ecr-registry` のコンテナが起動していないことを `docker ps` で確かめる
- Floci は Lambda の実行環境のイメージ（`public.ecr.aws/lambda/nodejs:24`）も、`compose.yaml` の外でタグを指定して取得する。こちらは止められない（Lambda を動かすのに要る）。AWS が保守していて、パッチのたびに同じタグで更新されるため、digest では固定せず、タグで最新を取得することを受け入れる

## 見直すきっかけ

- コンテナイメージの Lambda や ECS など、ECR を使う構成を試す。そのときは、レジストリのイメージを digest で固定して指定する
- Floci の標準のレジストリのイメージが更新される、または ECR を止めたことで bootstrap や deploy が失敗するようになる
