<?php
// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeStr(string $s, int $max = 255): string {
    return mb_substr(trim(strip_tags($s)), 0, $max);
}
function sanitizeEmail(string $e): string {
    return filter_var(trim($e), FILTER_SANITIZE_EMAIL);
}

// ── Login ─────────────────────────────────────────────────────────────────────
function handleLogin(?mysqli $db): void {
    $data     = json_decode(file_get_contents('php://input'), true) ?? [];
    $login    = sanitizeStr($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (!$login || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username/email and password are required']);
        return;
    }

    $user = null;

    // Try MySQL first
    if ($db) {
        $stmt = $db->prepare(
            'SELECT id, username, email, password, user_type, points, streak
             FROM users WHERE username = ? OR email = ? LIMIT 1'
        );
        $stmt->bind_param('ss', $login, $login);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($user && !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
            return;
        }
    }

    // Fallback: file-based store
    if (!$user) {
        $users = loadUsers();
        foreach ($users as $u) {
            if (($u['username'] === $login || $u['email'] === $login) && $u['password'] === $password) {
                $user = $u; break;
            }
        }
    }

    // Demo fallback — always succeeds
    if (!$user) {
        $user = ['id' => 1, 'username' => $login, 'email' => '', 'user_type' => $data['user_type'] ?? 'student', 'points' => 0, 'streak' => 0];
    }

    $token = makeJwt(['id' => $user['id'], 'username' => $user['username'], 'user_type' => $user['user_type']]);
    echo json_encode([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'id'        => (int)$user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'] ?? '',
            'user_type' => $user['user_type'],
            'points'    => (int)($user['points'] ?? 0),
            'streak'    => (int)($user['streak'] ?? 0),
        ]
    ]);
}

// ── Signup ────────────────────────────────────────────────────────────────────
function handleSignup(?mysqli $db): void {
    $data      = json_decode(file_get_contents('php://input'), true) ?? [];
    $fullname  = sanitizeStr($data['fullname']  ?? '');
    $username  = sanitizeStr($data['username']  ?? '', 50);
    $email     = sanitizeEmail($data['email']   ?? '');
    $password  = $data['password']              ?? '';
    $user_type = in_array($data['user_type'] ?? '', ['student','tutor']) ? $data['user_type'] : 'student';

    if (!$fullname || !$username || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid email address']);
        return;
    }
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters']);
        return;
    }

    // Try MySQL
    if ($db) {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->bind_param('s', $username);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $stmt->close();
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Username already taken']);
            return;
        }
        $stmt->close();

        $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->bind_param('s', $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $stmt->close();
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Email already registered']);
            return;
        }
        $stmt->close();

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (fullname, username, email, password, user_type, points, streak) VALUES (?, ?, ?, ?, ?, 0, 0)');
        $stmt->bind_param('sssss', $fullname, $username, $email, $hash, $user_type);
        if ($stmt->execute()) {
            $new_id = $db->insert_id;
            $stmt->close();
            echo json_encode(['success' => true, 'user' => ['id' => $new_id, 'username' => $username, 'email' => $email, 'user_type' => $user_type, 'points' => 0, 'streak' => 0]]);
            return;
        }
        $stmt->close();
    }

    // Fallback: file-based store (plain password — dev only)
    $users = loadUsers();
    foreach ($users as $u) {
        if ($u['username'] === $username) { http_response_code(409); echo json_encode(['success' => false, 'error' => 'Username already taken']); return; }
        if ($u['email'] === $email)       { http_response_code(409); echo json_encode(['success' => false, 'error' => 'Email already registered']); return; }
    }
    $new_id = time();
    $users[] = ['id' => $new_id, 'fullname' => $fullname, 'username' => $username, 'email' => $email, 'password' => $password, 'user_type' => $user_type, 'points' => 0, 'streak' => 0];
    saveUsers($users);
    echo json_encode(['success' => true, 'user' => ['id' => $new_id, 'username' => $username, 'email' => $email, 'user_type' => $user_type, 'points' => 0, 'streak' => 0]]);
}

// ── Get profile ───────────────────────────────────────────────────────────────
function handleGetProfile(?mysqli $db): void {
    $token   = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $payload = verifyJwt($token);
    if (!$payload) { http_response_code(401); echo json_encode(['success' => false, 'error' => 'Invalid token']); return; }

    if ($db) {
        $stmt = $db->prepare('SELECT id, fullname, username, email, user_type, points, streak FROM users WHERE id = ?');
        $stmt->bind_param('i', $payload['id']);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($user) { echo json_encode(['success' => true, 'user' => $user]); return; }
    }

    echo json_encode(['success' => true, 'user' => ['id' => $payload['id'], 'username' => $payload['username'], 'user_type' => $payload['user_type']]]);
}

// ── Update profile ────────────────────────────────────────────────────────────
function handleUpdateProfile(?mysqli $db): void {
    $token   = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $payload = verifyJwt($token);
    if (!$payload) { http_response_code(401); echo json_encode(['success' => false, 'error' => 'Invalid token']); return; }

    $data     = json_decode(file_get_contents('php://input'), true) ?? [];
    $fullname = sanitizeStr($data['fullname'] ?? '');
    $email    = sanitizeEmail($data['email']  ?? '');

    if ($db && ($fullname || $email)) {
        $fields = []; $types = ''; $values = [];
        if ($fullname) { $fields[] = 'fullname = ?'; $types .= 's'; $values[] = $fullname; }
        if ($email)    { $fields[] = 'email = ?';    $types .= 's'; $values[] = $email; }
        $types .= 'i'; $values[] = $payload['id'];
        $stmt = $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->bind_param($types, ...$values);
        $stmt->execute(); $stmt->close();
    }
    echo json_encode(['success' => true, 'message' => 'Profile updated']);
}

// ── Change password ───────────────────────────────────────────────────────────
function handleChangePassword(?mysqli $db): void {
    $token   = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    $payload = verifyJwt($token);
    if (!$payload) { http_response_code(401); echo json_encode(['success' => false, 'error' => 'Invalid token']); return; }

    $data        = json_decode(file_get_contents('php://input'), true) ?? [];
    $oldPassword = $data['old_password'] ?? '';
    $newPassword = $data['new_password'] ?? '';

    if (!$oldPassword || !$newPassword || strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Valid old and new passwords required (min 6 chars)']);
        return;
    }

    if ($db) {
        $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
        $stmt->bind_param('i', $payload['id']);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$user || !password_verify($oldPassword, $user['password'])) {
            http_response_code(401); echo json_encode(['success' => false, 'error' => 'Current password is incorrect']); return;
        }
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
        $stmt->bind_param('si', $hash, $payload['id']);
        $stmt->execute(); $stmt->close();
    }
    echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function handleLeaderboard(?mysqli $db): void {
    $limit = min((int)($_GET['limit'] ?? 10), 50);
    if ($db) {
        $stmt = $db->prepare('SELECT username, points, streak FROM users ORDER BY points DESC LIMIT ?');
        $stmt->bind_param('i', $limit);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        echo json_encode(['success' => true, 'leaderboard' => array_map(fn($r, $i) => ['rank' => $i+1, 'username' => $r['username'], 'points' => (int)$r['points'], 'streak' => (int)$r['streak']], $rows, array_keys($rows))]);
        return;
    }
    // Fallback demo leaderboard
    echo json_encode(['success' => true, 'leaderboard' => [
        ['rank' => 1, 'username' => 'Alice',  'points' => 142, 'streak' => 7],
        ['rank' => 2, 'username' => 'Bob',    'points' => 118, 'streak' => 4],
        ['rank' => 3, 'username' => 'Carol',  'points' => 97,  'streak' => 3],
        ['rank' => 4, 'username' => 'Dave',   'points' => 83,  'streak' => 2],
    ]]);
}
