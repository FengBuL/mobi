#!/usr/bin/env bash
set -euo pipefail

# 构建网页版并发布到：
#   1. Cloudflare Pages「mobieditor」→ https://mobieditor.cn/（官方入口，根路径）
#   2. 公开仓 gh-pages → https://fengbul.github.io/mobi/（旧地址，子路径 /mobi/）
#   3. Cloudflare Worker「mobi-download」→ https://app.mobieditor.cn/（桌面下载页）
#
# 开发仓是私有的。Cloudflare 只收纯产物；GitHub Pages 同样只推产物，源码不出私有仓。

cd "$(dirname "$0")/.."

DIST_REPO=${MOBI_DIST_REPO:-https://github.com/FengBuL/mobi.git}
CF_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-9964fe05e9a80fd34ad887f1c7da58c7}
CF_EDITOR_PROJECT=${MOBI_CF_EDITOR_PROJECT:-mobieditor}

deploy_pages() {
  local directory=$1
  local project=$2
  CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" npx wrangler pages deploy "$directory" \
    --project-name="$project" \
    --branch=main \
    --commit-dirty=true
}

echo "==> 构建网页编辑器（根路径，给 mobieditor.cn）"
VITE_APP_BASE_PATH=/ pnpm --filter @mobi/web build
deploy_pages apps/web/dist "$CF_EDITOR_PROJECT"

echo "==> 发布桌面下载页（app.mobieditor.cn）"
CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" npx wrangler deploy --config apps/download/wrangler.toml

echo "==> 同步旧地址 GitHub Pages（/mobi/）"
VITE_APP_BASE_PATH=/mobi/ pnpm --filter @mobi/web build
cd apps/web/dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -qm "deploy web $(date +%Y-%m-%d.%H%M)"
git push -f "$DIST_REPO" gh-pages:gh-pages
rm -rf .git
cd ../../..

echo "网页版已发布：https://mobieditor.cn/"
echo "桌面下载：https://app.mobieditor.cn/"
echo "旧地址仍可用：https://fengbul.github.io/mobi/"
