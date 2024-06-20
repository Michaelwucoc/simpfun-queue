<?php
$servername = "1Panel-mysql-FCWM";
$username = "queue";
$password = "queue2024";
$dbname = "queue_db";

// 启用错误报告
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// 获取队列状态接口
if ($_SERVER['REQUEST_METHOD'] == 'GET' && isset($_GET['action']) && $_GET['action'] == 'queue_status') {
  $sql = "SELECT * FROM queue_status WHERE timestamp >= NOW() - INTERVAL 2 HOUR ORDER BY timestamp DESC";
  $result = $conn->query($sql);

  if ($result === FALSE) {
    die("Error: " . $conn->error);
  }

  $data = array();
  while($row = $result->fetch_assoc()) {
    // 处理特殊情况
    if ($row['running'] == 0) {
      $row['running'] = "队列空";
    }
    if ($row['waiting'] == 0) {
      $row['waiting'] = "队列空";
    }
    if ($row['num_first_waiting'] == -1) {
      $row['num_first_waiting'] = "队列空";
    }
    $data[] = $row;
  }

  echo json_encode($data);
  exit;
}

// 从API获取数据并存储到数据库
function fetchAndStoreQueueStatus($conn) {
  $api_url = 'https://api.simpfun.cn/api/ins/1/tasks?auth=false';
  $response = file_get_contents($api_url);
  if ($response === FALSE) {
    die("Error fetching API data");
  }
  $data = json_decode($response, true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    die("Error decoding JSON: " . json_last_error_msg());
  }

  $running = $data['running'];
  $waiting = $data['waiting'];
  $num_first_waiting = $data['num_first_waiting'];
  $running_pro = $data['running_pro'];
  $waiting_pro = $data['waiting_pro'];
  $num_first_waiting_pro = $data['num_first_waiting_pro'];

  $sqlNormal = "INSERT INTO queue_status (queue_type, running, waiting, num_first_waiting) VALUES ('normal', $running, $waiting, $num_first_waiting)";
  if ($conn->query($sqlNormal) === FALSE) {
    die("Error: " . $conn->error);
  }

  $sqlPro = "INSERT INTO queue_status (queue_type, running, waiting, num_first_waiting) VALUES ('pro', $running_pro, $waiting_pro, $num_first_waiting_pro)";
  if ($conn->query($sqlPro) === FALSE) {
    die("Error: " . $conn->error);
  }
}

// 定期清理超过12小时的数据
function cleanOldData($conn) {
  $sql = "DELETE FROM queue_status WHERE timestamp < NOW() - INTERVAL 12 HOUR";
  if ($conn->query($sql) === FALSE) {
    die("Error deleting old data: " . $conn->error);
  }
}

// 每分钟获取一次数据
if ($_SERVER['REQUEST_METHOD'] == 'GET' && isset($_GET['action']) && $_GET['action'] == 'update_queue_status') {
  fetchAndStoreQueueStatus($conn);
  cleanOldData($conn);
  echo json_encode(['message' => 'Queue status updated']);
  exit;
}

$conn->close();
?>