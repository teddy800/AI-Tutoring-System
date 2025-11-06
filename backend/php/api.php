<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

$db = new mysqli('localhost', 'root', '', 'tutoring_system');
if ($db->connect_error) {
    die(json_encode(['success' => false, 'error' => 'Database connection failed']));
}

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $user_type = $data['user_type'] ?? '';

    $stmt = $db->prepare('SELECT id, username, password, user_type, points, streak FROM users WHERE username = ?');
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user && password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'user_type' => $user['user_type'],
                'points' => $user['points'],
                'streak' => $user['streak']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    }
    $stmt->close();
} elseif ($action === 'upload-content') {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = $data['title'] ?? '';
    $body = $data['body'] ?? '';
    $uploaded_by = $data['uploaded_by'] ?? 0;

    $stmt = $db->prepare('INSERT INTO content (title, body, uploaded_by) VALUES (?, ?, ?)');
    $stmt->bind_param('ssi', $title, $body, $uploaded_by);
    if ($stmt->execute()) {
        $stmt = $db->prepare('UPDATE users SET points = points + 10 WHERE id = ?');
        $stmt->bind_param('i', $uploaded_by);
        $stmt->execute();
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Upload failed']);
    }
    $stmt->close();
} elseif ($action === 'feedback') {
    $data = json_decode(file_get_contents('php://input'), true);
    $user_id = $data['user_id'] ?? 0;
    $type = $data['type'] ?? '';
    $message = $data['message'] ?? '';

    $stmt = $db->prepare('INSERT INTO feedback (user_id, type, message) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $user_id, $type, $message);
    if ($stmt->execute()) {
        $stmt = $db->prepare('UPDATE users SET points = points + 2 WHERE id = ?');
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Feedback submission failed']);
    }
    $stmt->close();
}

$db->close();
?>