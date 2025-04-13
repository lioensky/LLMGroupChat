@echo off
REM 设置窗口标题
title AI 女仆聊天室服务器 (端口 4086)

REM 切换到批处理文件所在的目录
REM %~dp0 会扩展为包含驱动器号和路径的当前批处理脚本的目录
cd /d %~dp0

echo ======================================
echo  AI 女仆聊天室 本地服务器启动脚本 
echo ======================================
echo.
echo 正在尝试启动 Python HTTP 服务器...
echo.
echo 将在以下地址提供服务:
echo http://localhost:4086 (本机访问)
echo http://<您的局域网IP地址>:4086 (局域网内其他设备访问)
echo.
echo 您需要查找本机的局域网 IP 地址 (通常类似 192.168.x.x)。
echo 可以在命令提示符(cmd)中输入 'ipconfig' 查看 IPv4 地址。
echo.
echo 服务器将在端口 4086 上运行。
echo 请确保防火墙允许其他设备访问此端口。
echo. 
echo 按下 Ctrl + C 可以停止服务器。
echo.
echo ======================================
echo.

REM 使用 Python 3 启动 HTTP 服务器，监听端口 4086
python -m http.server 4086

REM 如果 Python 命令失败或服务器停止，会执行到这里
echo.
echo 服务器已停止或启动失败。
echo 按任意键退出...
pause > nul 
