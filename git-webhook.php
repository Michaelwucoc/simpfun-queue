<?php
// 设置项目目录
$projectDir = '/opt/1panel/apps/openresty/openresty/www/sites/queue.709000.xyz/index/simpfun-queue';

// 执行git pull命令
$command = "cd $projectDir && git pull 2>&1";
$output = shell_exec($command);

// 获取当前时间
$date = date('Y-m-d H:i:s');

// 记录日志
$logMessage = "[$date] Git Pull Output:\n$output\n";
file_put_contents('log.txt', $logMessage, FILE_APPEND);

// 输出结果到浏览器
echo nl2br($logMessage);