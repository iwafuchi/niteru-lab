#!/usr/bin/env bash
# CDK を Floci（ローカルの AWS エミュレーター）に向けて実行する。
# 認証情報を Floci 用のダミーに差し替えるので、接続先の設定が漏れても
# 本物の AWS には認証で拒否され、誤って本物にデプロイされることはない
set -euo pipefail

unset AWS_PROFILE AWS_SESSION_TOKEN
export AWS_ENDPOINT_URL=http://127.0.0.1:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=ap-northeast-1
export AWS_DEFAULT_REGION=ap-northeast-1

exec cdk "$@" -c target=local
