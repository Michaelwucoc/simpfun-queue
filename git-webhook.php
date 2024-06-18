<?php
//git webhook 自动部署脚本
//抄的，不是Milk原创。
$requestBody = file_get_contents("php://input"); //该方法可以接收post传过来的json字符串
if (empty($requestBody)) { //判断数据是不是空
    die('send fail');
}
$content = json_decode($requestBody, true); //数据转换
//若是主分支且提交数大于0
if ($content['ref'] == 'refs/heads/master') {
    //PHP函数执行git命令
    $res = shell_exec('cd /opt/1panel/apps/openresty/openresty/www/sites/queue.709000.xyz/index/simpfun-queue
           && git reset --hard origin/main && git clean -f
           && git pull 2>&1 && git checkout main');

    //$file 是我们通过触发hook通过上面shell_exec命令拉取到的仓库代码到了/www/wwwroot/wp-content/themes/Art_Blog/目录下
    //$file = '/opt/1panel/apps/openresty/openresty/www/sites/queue.709000.xyz/index/simpfun-queue/dist';
    //$newFile 再将上面拉取到的代码dist里面打包文件复制到网站实际项目地址文件夹（也就是我网站主题Art_Blog目录下）
    //$newFile = '/opt/1panel/apps/openresty/openresty/www/sites/queue.709000.xyz/index/simpfun-queue';
    //file_copy($file, $newFile);

    $res_log = '-------------------------' . PHP_EOL;
    $res_log.= ' 在' . date('Y-m-d H:i:s') . '向' . $content['repository']['name']
               . '项目的' . $content['ref'] . '分支push' . $res;
    //将每次拉取信息追加写入到日志里
    file_put_contents("git-webhook.txt", $res_log, FILE_APPEND);
}

function file_copy($src, $dst) {
    $dir = opendir($src);
    @mkdir($dst);
    while (false !== ($file = readdir($dir))) {
        if (($file != '.') && ($file != '..')) {
            if (is_dir($src . '/' . $file)) {
                file_copy($src . '/' . $file, $dst . '/' . $file);
            } else {
                copy($src . '/' . $file, $dst . '/' . $file);
            }
        }
    }
    closedir($dir);
}