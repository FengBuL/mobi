#!/usr/bin/env bash
set -euo pipefail

# 构建网页版并发布到公开分发仓 FengBuL/mobi 的 gh-pages 分支。
#
# 开发仓是私有的，而免费版 GitHub Pages 只能挂在公开仓库上，
# 所以网页版在本地构建，只把纯产物推过去——源码不出私有仓。

cd "$(dirname "$0")/.."

DIST_REPO=${MOBI_DIST_REPO:-https://github.com/FengBuL/mobi.git}

VITE_APP_BASE_PATH=/mobi/ pnpm --filter @mobi/web build

cd apps/web/dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -qm "deploy web $(date +%Y-%m-%d.%H%M)"
git push -f "$DIST_REPO" gh-pages:gh-pages
rm -rf .git

echo "网页版已发布：https://fengbul.github.io/mobi/"
