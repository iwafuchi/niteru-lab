#!/usr/bin/env bash
# Floci を停止し、Floci が起動した Lambda などのコンテナも削除する。
# これらのコンテナは compose の管理外のため、docker compose down だけでは残る
set -euo pipefail

docker compose down

containers=$(docker ps -aq --filter label=floci=true)
if [ -n "$containers" ]; then
  echo "Floci が起動したコンテナを削除します"
  # shellcheck disable=SC2086
  docker rm -f $containers >/dev/null
fi
