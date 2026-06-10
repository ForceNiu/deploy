#!/bin/bash
# 检查 Cloudflare Pages 部署状态
# 用法: ./check-deploy.sh [标记字符串]

SITE="https://travel-plan-3cu.pages.dev"
MARKER="${1:-navTopBtn}"  # 默认检测最新改动的标记

echo "⏳ 等待部署完成（检测标记: $MARKER）..."
for i in $(seq 1 30); do
    RESULT=$(curl -s "$SITE/" | grep -o "$MARKER" | head -1)
    if [ "$RESULT" = "$MARKER" ]; then
        echo "✅ 部署成功！（第 $i 次检测，约 $((i * 10)) 秒）"
        exit 0
    fi
    echo "  第 $i 次检测未就绪，10秒后重试..."
    sleep 10
done
echo "❌ 超时（5分钟），请检查 Cloudflare Pages dashboard"
exit 1
