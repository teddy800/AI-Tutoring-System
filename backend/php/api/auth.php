<?php
use Firebase\JWT\JWT;

// ── Rate limiting awareness ───────────────────────────────────────────────────
function getClientIp(): string {
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($forwarded) {
        return trim(explode(',', $forwarded)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

// ── Input sanitization ────────────────────────────────────────────────────────
function sanitizeString(string $input, int $maxLen = 255): string {
    $clean = trim(strip_tags($input));
    return mb_substr($clean, 0, $maxLen);
}

function sanitizeEmail(string $email): string {
    return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
}

// ── JWT helper ────────────────────────────────────────────────────────────────
function makeToken(array $user): string {
    $secret = $_ENV['JWT_SECRET'] ?? '';
    $now    = time();
    $payload = [
        'iat'       => $now,
        'exp'       => $now + 3600,
        'id'        => (int)$user['id'],
        'username'  => $user['username'],
        'user_type' => $user['user_type'],
    ];
    return JWT::encode($payload, $secret, 'HS256');
}

// ── Login (username OR email) ─────────────────────────────────────────────────
function handleLogin(\mysqli $db): void {
    $data     = json_decode(file_get_contents('php://input'), true);
    $login    = sanitizeString($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (!$login || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username/email and password are required']);
        return;
    }

    // Support login with username OR email
    $stmt = $db->prepare(
        'SELECT id, username, email, password, user_type, points, streak
         FROM users WHERE username = ? OR email = ? LIMIT 1'
    );
    $stmt->bind_param('ss', $login, $login);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        return;
    }

    $token = makeToken($user);
    echo json_encode([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'id'        => (int)$user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'],
            'user_type' => $user['user_type'],
            'points'    => (int)$user['points'],
            'streak'    => (int)$user['streak'],
        ]
    ]);
}

// ── Signup ────────────────────────────────────────────────────────────────────
function handleSignup(\mysqli $db): void {
    $data      = json_decode(file_get_contents('php://input'), true);
    $fullname  = sanitizeString($data['fullname']  ?? '');
    $username  = sanitizeString($data['username']  ?? '', 50);
    $email     = sanitizeEmail($data['email']      ?? '');
    $password  = $data['password']                 ?? '';
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

    // Check username taken
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

    // Check email taken
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
    $stmt = $db->prepare(
        'INSERT INTO users (fullname, username, email, password, user_type, points, streak) VALUES (?, ?, ?, ?, ?, 0, 0)'
    );
    $stmt->bind_param('sssss', $fullname, $username, $email, $hash, $user_type);

    if ($stmt->execute()) {
        $new_id = $db->insert_id;
        $stmt->close();
        echo json_encode([
            'success' => true,
            'user' => [
                'id'        => $new_id,
                'username'  => $username,
                'email'     => $email,
                'user_type' => $user_type,
                'points'    => 0,
                'streak'    => 0
            ]
        ]);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Registration failed. Please try again.']);
    }
}

// ── Get profile ───────────────────────────────────────────────────────────────
function handleGetProfile(\mysqli $db): void {
    $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authentication required']);
        return;
    }

    try {
        $secret  = $_ENV['JWT_SECRET'] ?? '';
        $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secret, 'HS256'));
        $userId  = (int)$payload->id;
    } catch (\Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }

    $stmt = $db->prepare(
        'SELECT id, fullname, username, email, user_type, points, streak FROM users WHERE id = ?'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        return;
    }

    echo json_encode(['success' => true, 'user' => $user]);
}

// ── Update profile ────────────────────────────────────────────────────────────
function handleUpdateProfile(\mysqli $db): void {
    $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authentication required']);
        return;
    }

    try {
        $secret  = $_ENV['JWT_SECRET'] ?? '';
        $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secret, 'HS256'));
        $userId  = (int)$payload->id;
    } catch (\Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }

    $data     = json_decode(file_get_contents('php://input'), true);
    $fullname = sanitizeString($data['fullname'] ?? '');
    $email    = sanitizeEmail($data['email']    ?? '');

    if (!$fullname && !$email) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid email address']);
        return;
    }

    // Build dynamic update query
    $fields = [];
    $types  = '';
    $values = [];

    if ($fullname) { $fields[] = 'fullname = ?'; $types .= 's'; $values[] = $fullname; }
    if ($email)    { $fields[] = 'email = ?';    $types .= 's'; $values[] = $email; }

    $types .= 'i';
    $values[] = $userId;

    $sql  = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->bind_param($types, ...$values);

    if ($stmt->execute()) {
        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to update profile']);
    }
}

// ── Change password ───────────────────────────────────────────────────────────
function handleChangePassword(\mysqli $db): void {
    $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authentication required']);
        return;
    }

    try {
        $secret  = $_ENV['JWT_SECRET'] ?? '';
        $payload = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($secret, 'HS256'));
        $userId  = (int)$payload->id;
    } catch (\Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        return;
    }

    $data        = json_decode(file_get_contents('php://input'), true);
    $oldPassword = $data['old_password'] ?? '';
    $newPassword = $data['new_password'] ?? '';

    if (!$oldPassword || !$newPassword) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Both old and new passwords are required']);
        return;
    }
    if (strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'New password must be at least 6 characters']);
        return;
    }

    // Verify old password
    $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($oldPassword, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Current password is incorrect']);
        return;
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
    $stmt->bind_param('si', $hash, $userId);

    if ($stmt->execute()) {
        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to change password']);
    }
}
