<?php
use Firebase\JWT\JWT;

function handleLogin(\mysqli $db): void {
    $data     = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username and password are required']);
        return;
    }

    $stmt = $db->prepare(
        'SELECT id, username, password, user_type, points, streak FROM users WHERE username = ?'
    );
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        return;
    }

    $secret = $_ENV['JWT_SECRET'] ?? '';
    $now    = time();
    $payload = [
        'iat'       => $now,
        'exp'       => $now + 3600,
        'id'        => (int)$user['id'],
        'username'  => $user['username'],
        'user_type' => $user['user_type'],
    ];

    $token = JWT::encode($payload, $secret, 'HS256');

    echo json_encode([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'id'        => (int)$user['id'],
            'username'  => $user['username'],
            'user_type' => $user['user_type'],
            'points'    => (int)$user['points'],
            'streak'    => (int)$user['streak'],
        ]
    ]);
}

function handleSignup(\mysqli $db): void {
    $data      = json_decode(file_get_contents('php://input'), true);
    $fullname  = trim($data['fullname']  ?? '');
    $username  = trim($data['username']  ?? '');
    $email     = trim($data['email']     ?? '');
    $password  = $data['password']       ?? '';
    $user_type = $data['user_type']      ?? 'student';

    if (!$fullname || !$username || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
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

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare('INSERT INTO users (fullname, username, email, password, user_type, points, streak) VALUES (?, ?, ?, ?, ?, 0, 0)');
    $stmt->bind_param('sssss', $fullname, $username, $email, $hash, $user_type);

    if ($stmt->execute()) {
        $new_id = $db->insert_id;
        $stmt->close();
        echo json_encode(['success' => true, 'user' => [
            'id' => $new_id, 'username' => $username,
            'user_type' => $user_type, 'points' => 0, 'streak' => 0
        ]]);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Registration failed']);
    }
}
