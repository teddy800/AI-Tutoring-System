<?php
require_once __DIR__ . '/vendor/autoload.php';

$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

// ── CORS ──────────────────────────────────────────────────────────────────────
$allowedOrigin = $_ENV['ALLOWED_ORIGIN'] ?? '';
$origin        = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($allowedOrigin && $origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
}
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Rate limiting (APCu with file-based fallback) ─────────────────────────────
function checkRateLimit(string $ip): bool {
    $max    = (int)($_ENV['RATE_LIMIT_MAX']    ?? 5);
    $window = (int)($_ENV['RATE_LIMIT_WINDOW'] ?? 60);
    $key    = "login_attempts_{$ip}";

    if (function_exists('apcu_fetch')) {
        $current = apcu_fetch($key) ?: 0;
        if ($current >= $max) return false;
        apcu_store($key, $current + 1, $window);
        return true;
    }

    // File-based fallback
    $file = sys_get_temp_dir() . '/rl_' . md5($key) . '.json';
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : ['count' => 0, 'expires' => 0];
    if (time() > $data['expires']) {
        $data = ['count' => 0, 'expires' => time() + $window];
    }
    if ($data['count'] >= $max) return false;
    $data['count']++;
    file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

// ── Database ──────────────────────────────────────────────────────────────────
$db = new mysqli(
    $_ENV['DB_HOST']     ?? 'localhost',
    $_ENV['DB_USER']     ?? 'root',
    $_ENV['DB_PASSWORD'] ?? '',
    $_ENV['DB_NAME']     ?? 'tutoring_system'
);
if ($db->connect_error) {
    http_response_code(500);
    die(json_encode(['success' => false, 'error' => 'Database connection failed']));
}
$db->set_charset('utf8mb4');

// ── Module includes ───────────────────────────────────────────────────────────
require_once __DIR__ . '/api/auth.php';
require_once __DIR__ . '/api/content.php';
require_once __DIR__ . '/api/feedback.php';

// ── Router ────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        if (!checkRateLimit($ip)) {
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => 'Too many login attempts. Please try again later.']);
            break;
        }
        handleLogin($db);
        break;

    case 'upload-content':
        handleUploadContent($db);
        break;

    case 'feedback':
        handleFeedback($db);
        break;

    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Unknown action']);
}

$db->close();
