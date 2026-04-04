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
