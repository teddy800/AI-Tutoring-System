<?php
// ── Load Composer autoloader if available ─────────────────────────────────────
$autoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload;
    $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();
} else {
    // Manual .env loader (no Composer needed)
    $envFile = __DIR__ . '/.env';
    if (file_exists($envFile)) {
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                [$key, $val] = explode('=', $line, 2);
                $_ENV[trim($key)] = trim($val);
                putenv(trim($key) . '=' . trim($val));
            }
        }
    }
}

// ── CORS ──────────────────────────────────────────────────────────────────────
$allowedOrigin = $_ENV['ALLOWED_ORIGIN'] ?? '*';
$origin        = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($allowedOrigin === '*' || $origin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . ($allowedOrigin === '*' ? '*' : $origin));
    if ($allowedOrigin !== '*') header('Vary: Origin');
}
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
function checkRateLimit(string $ip): bool {
    $max    = (int)($_ENV['RATE_LIMIT_MAX']    ?? 10);
    $window = (int)($_ENV['RATE_LIMIT_WINDOW'] ?? 60);
    $key    = 'login_attempts_' . $ip;
    if (function_exists('apcu_fetch')) {
        $current = apcu_fetch($key) ?: 0;
        if ($current >= $max) return false;
        apcu_store($key, $current + 1, $window);
        return true;
    }
    $file = sys_get_temp_dir() . '/rl_' . md5($key) . '.json';
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : ['count' => 0, 'expires' => 0];
    if (time() > $data['expires']) $data = ['count' => 0, 'expires' => time() + $window];
    if ($data['count'] >= $max) return false;
    $data['count']++;
    file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

// ── Database connection (optional) ────────────────────────────────────────────
function getDb(): ?mysqli {
    $db = @new mysqli(
        $_ENV['DB_HOST']     ?? '127.0.0.1',
        $_ENV['DB_USER']     ?? 'root',
        $_ENV['DB_PASSWORD'] ?? '',
        $_ENV['DB_NAME']     ?? 'tutoring_system',
        (int)($_ENV['DB_PORT'] ?? 3307)
    );
    if ($db->connect_error) return null;
    $db->set_charset('utf8mb4');
    return $db;
}

// ── Simple JWT (no Composer needed) ──────────────────────────────────────────
function makeJwt(array $payload): string {
    $secret = $_ENV['JWT_SECRET'] ?? 'neurallearn_secret';
    $header  = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + 3600;
    $body    = base64_encode(json_encode($payload));
    $sig     = base64_encode(hash_hmac('sha256', "$header.$body", $secret, true));
    return "$header.$body.$sig";
}

function verifyJwt(string $token): ?array {
    $secret = $_ENV['JWT_SECRET'] ?? 'neurallearn_secret';
    $parts  = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;
    $expected = base64_encode(hash_hmac('sha256', "$header.$body", $secret, true));
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(base64_decode($body), true);
    if (!$payload || $payload['exp'] < time()) return null;
    return $payload;
}

// ── Local user store (file-based fallback when no MySQL) ──────────────────────
function getUsersFile(): string { return sys_get_temp_dir() . '/nl_users.json'; }
function loadUsers(): array {
    $f = getUsersFile();
    return file_exists($f) ? (json_decode(file_get_contents($f), true) ?? []) : [];
}
function saveUsers(array $users): void {
    file_put_contents(getUsersFile(), json_encode($users), LOCK_EX);
}

// ── Module includes ───────────────────────────────────────────────────────────
require_once __DIR__ . '/api/auth.php';
require_once __DIR__ . '/api/content.php';
require_once __DIR__ . '/api/feedback.php';

// ── Router ────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$db     = getDb(); // null if MySQL unavailable — handlers must cope

switch ($action) {
    case 'login':
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        if (!checkRateLimit($ip)) {
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => 'Too many attempts. Try again later.']);
            break;
        }
        handleLogin($db);
        break;

    case 'signup':
        handleSignup($db);
        break;

    case 'upload-content':
        handleUploadContent($db);
        break;

    case 'feedback':
        handleFeedback($db);
        break;

    case 'get-profile':
        handleGetProfile($db);
        break;

    case 'update-profile':
        handleUpdateProfile($db);
        break;

    case 'change-password':
        handleChangePassword($db);
        break;

    case 'leaderboard':
        handleLeaderboard($db);
        break;

    case 'health':
        echo json_encode([
            'success'   => true,
            'status'    => 'ok',
            'db'        => $db !== null ? 'connected' : 'unavailable',
            'timestamp' => time()
        ]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Unknown action']);
}

if ($db) $db->close();
