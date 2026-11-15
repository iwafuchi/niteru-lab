# 0002. ローカルの AWS エミュレーターに Floci を使う

- 状態：採用
- 日付：2026-11-15

## 背景

CDK でのデプロイ（Lambda、Function URL、S3、SSM）を学ぶにあたり、本物の AWS だけで試すと、デプロイと削除を繰り返すたびに時間と費用がかかる。AWS アカウントの準備ができる前でも CDK の書き方を試せるように、ローカルで AWS の API をエミュレートする環境を用意する。

## 判断

- ローカルの AWS エミュレーターには [Floci](https://github.com/floci-io/floci) を使う。`compose.yaml` で起動し、`pnpm floci:up` / `pnpm floci:down` で操作する
- イメージは digest で固定し、Dependabot（`docker-compose`）で更新する。公開から 7 日以内のバージョンは使わない
- ポートはホストの `127.0.0.1` にだけ公開する
- CDK のデプロイは 2 段階で学ぶ
  - 3a：Floci で CDK の書き方とデプロイの流れを試す
  - 3b：本物の AWS で、エミュレーターでは確かめられないこと（IAM 認証付きの Function URL、最小権限の IAM、コールドスタート、cdk-nag）を確かめる

## 動作確認の結果（Floci 2.4.0）

| 確認したこと                               | 結果                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| S3（バケット作成、日本語の内容の読み書き） | 動く                                                                             |
| SSM SecureString（登録、読み出し）         | 動く。ただし `--with-decryption` なしでも平文が返る（本物は暗号文）              |
| Lambda nodejs24.x（作成、呼び出し）        | 動く（Node v24.22.3）。初回は実行環境のイメージ取得で約 25 秒、2 回目は約 0.6 秒 |
| Function URL（AuthType AWS_IAM）           | 作成と呼び出しはできる。**署名なしでも 200 が返り、IAM 認証は検証されない**      |
| CDK の bootstrap と deploy                 | 未確認                                                                           |

## 検討した案

### AWS Emulator（aws/aws-emulator、AWS 公式）

- 利点：AWS 公式。パッケージが GPG で署名されている。docker.sock が不要。SigV4 の署名を検証するので本物に近い
- 採用しない理由：**Lambda の関数を実行できない**。公式リポジトリの既知の不具合（`issues/things-that-do-not-work/`、重大度 HIGH）に、Invoke はランタイムがないため `NotImplemented` を返すと記載されている。このプロジェクトの中心は Lambda のため使えない

### LocalStack

- 採用しない理由：2026 年 3 月に Community 版が終了し、利用に登録と認証トークンが必要になった

### 本物の AWS だけで学ぶ

- 採用しない理由：デプロイと削除を繰り返す試行錯誤に時間と費用がかかる。ただし、エミュレーターで確かめられないことは本物の AWS で確かめる（3b）

## 注意点

- **docker.sock をマウントするため、Floci のコンテナはホストの Docker を操作できる。** 公式のリリース版を digest で固定し、開発中に起動するときだけ使う。nightly 版は使わない
- Floci を止めても、Floci が起動した Lambda のコンテナ（ラベル `floci=true`）が残る。`pnpm floci:down` で一緒に削除する
- エミュレーターで動いたことは、本物の AWS で動くことの保証にならない。とくに IAM と認証は本物の AWS で確かめる

## 見直すきっかけ

- AWS Emulator が Lambda を実行できるようになる（公式で、docker.sock も不要なため、乗り換えを検討する）
- Floci で CDK の bootstrap や deploy が通らず、回避に手間がかかる
- Floci の開発が止まる、またはライセンスが変わる
