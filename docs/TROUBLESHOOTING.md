# 故障排查指南

## Supervisor 权限错误 (EACCES)

### 错误信息

```
activity-rule-editor: ERROR (spawn error)
spawnerr: unknown error making dispatchers for 'activity-rule-editor': EACCES
```

### 原因

`EACCES` 表示权限被拒绝，通常是因为：
1. 运行用户没有权限访问项目目录
2. 虚拟环境路径不存在或没有执行权限
3. 日志目录没有写入权限

### 解决步骤

#### 1. 检查配置中的用户

```bash
grep "^user=" /etc/supervisord.d/activity-rule-editor.ini
```

假设用户是 `dev`，继续以下步骤。

#### 2. 检查项目目录权限

```bash
# 查看项目目录权限
ls -la /opt/activity-rule-editor

# 确保运行用户有权限
sudo chown -R dev:dev /opt/activity-rule-editor
```

#### 3. 检查虚拟环境

```bash
# 检查虚拟环境是否存在
ls -la /opt/activity-rule-editor/.venv/bin/gunicorn

# 如果不存在，重新创建
cd /opt/activity-rule-editor
uv sync --extra production

# 确保可执行
chmod +x /opt/activity-rule-editor/.venv/bin/gunicorn
chmod +x /opt/activity-rule-editor/.venv/bin/python
```

#### 4. 检查日志目录权限

```bash
# 创建日志目录
sudo mkdir -p /var/log/activity-rule-editor

# 设置权限（根据配置中的用户）
sudo chown dev:dev /var/log/activity-rule-editor
sudo chmod 755 /var/log/activity-rule-editor
```

#### 5. 验证权限

```bash
# 切换到运行用户，测试访问
sudo -u dev ls /opt/activity-rule-editor
sudo -u dev /opt/activity-rule-editor/.venv/bin/python --version
sudo -u dev /opt/activity-rule-editor/.venv/bin/gunicorn --version
```

#### 6. 重新启动服务

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start activity-rule-editor
sudo supervisorctl status activity-rule-editor
```

### 快速修复脚本

```bash
#!/bin/bash
# 快速修复权限问题

USER="dev"  # 根据实际情况修改
PROJECT_DIR="/opt/activity-rule-editor"
LOG_DIR="/var/log/activity-rule-editor"

# 设置项目目录权限
sudo chown -R $USER:$USER $PROJECT_DIR

# 设置虚拟环境可执行
chmod +x $PROJECT_DIR/.venv/bin/gunicorn
chmod +x $PROJECT_DIR/.venv/bin/python

# 创建并设置日志目录权限
sudo mkdir -p $LOG_DIR
sudo chown $USER:$USER $LOG_DIR
sudo chmod 755 $LOG_DIR

# 重新加载 supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart activity-rule-editor

echo "权限修复完成，检查状态："
sudo supervisorctl status activity-rule-editor
```

## 其他常见问题

### 端口被占用

```bash
# 检查端口占用
sudo netstat -tlnp | grep 8000
# 或
sudo ss -tlnp | grep 8000

# 停止占用端口的进程
sudo kill <PID>
```

### 静态文件 404

```bash
# 检查静态文件目录
ls -la /opt/activity-rule-editor/web/dist

# 检查文件权限
sudo chown -R dev:dev /opt/activity-rule-editor/web/dist
```

### 服务无法访问

```bash
# 检查防火墙
sudo ufw status
# 或
sudo firewall-cmd --list-all

# 开放端口
sudo ufw allow 8000/tcp
```

