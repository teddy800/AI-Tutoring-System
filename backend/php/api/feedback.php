<?php
function handleFeedback(\mysqli $db): void {
    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = (int)($data['user_id'] ?? 0);
    $type    = trim($data['type']    ?? '');
    $message = trim($data['message'] ?? '');

    if (!$message) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Message is required']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO feedback (user_id, type, message) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $user_id, $type, $message);

    if ($stmt->execute()) {
        $stmt->close();
        if ($user_id > 0) {
            $stmt2 = $db->prepare('UPDATE users SET points = points + 2 WHERE id = ?');
            $stmt2->bind_param('i', $user_id);
            $stmt2->execute();
            $stmt2->close();
        }
        echo json_encode(['success' => true]);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Feedback submission failed']);
    }
}
