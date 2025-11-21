#!/bin/bash
# 快速部署脚本

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  Activity Rule Editor 部署脚本"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "pyproject.toml" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 更新后端依赖
echo "[1/3] 更新后端依赖..."
if command -v uv &> /dev/null; then
    uv sync --extra production
else
    echo "警告: 未找到 uv，请先安装 uv"
    exit 1
fi
echo "✓ 后端依赖已更新"
echo ""

# 检查前端静态文件
echo "[2/3] 检查前端静态文件..."
if [ ! -d "web/dist" ]; then
    echo "错误: web/dist 目录不存在"
    echo ""
    echo "请先在本地构建前端:"
    echo "  cd web"
    echo "  pnpm install"
    echo "  pnpm build"
    echo "  cd .."
    echo ""
    echo "然后提交构建后的 web/dist/ 目录到版本控制"
    exit 1
fi

# 检查 dist 目录是否为空
if [ -z "$(ls -A web/dist)" ]; then
    echo "错误: web/dist 目录为空"
    echo "请先在本地构建前端"
    exit 1
fi

echo "✓ 前端静态文件已就绪 (web/dist/)"
echo ""

# 重启服务（如果 supervisor 服务存在）
echo "[3/3] 检查服务状态..."
if sudo supervisorctl status activity-rule-editor >/dev/null 2>&1; then
    echo "重启服务..."
    sudo supervisorctl restart activity-rule-editor
    echo "✓ 服务已重启"
else
    echo "提示: supervisor 服务未配置，请手动配置:"
    echo "  sudo cp scripts/activity-rule-editor.ini /etc/supervisord.d/activity-rule-editor.ini"
    echo "  sudo supervisorctl reread"
    echo "  sudo supervisorctl update"
    echo "  sudo supervisorctl start activity-rule-editor"
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "前端构建目录: web/dist/"
echo "服务状态: sudo supervisorctl status activity-rule-editor"
echo "查看日志: sudo supervisorctl tail -f activity-rule-editor"
echo ""

