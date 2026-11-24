#!/usr/bin/env bash
# Floci を停止し、Floci が起動した Lambda などのコンテナも削除する。
# これらのコンテナは compose の管理外のため、docker compose down だけでは残る
set -euo pipefail

# 先に Floci を止め（新しいコンテナが増えないように）、Floci が起動したコンテナを消してから、
# ネットワークごと片付ける。コンテナが残っているとネットワークを削除できないため
docker compose stop

containers=$(docker ps -aq --filter label=floci=true)
if [ -n "$containers" ]; then
  echo "Floci が起動したコンテナを削除します"
  # shellcheck disable=SC2086
  docker rm -f --volumes $containers >/dev/null
fi

# Floci のイメージが作る匿名ボリューム（/app/data）は、--volumes を付けないと停止のたびに残る
docker compose down --volumes
