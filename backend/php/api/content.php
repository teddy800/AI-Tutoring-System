<?php
function handleUploadContent(\mysqli $db): void {
    $data        = json_decode(file_get_contents('php://input'), true);
    $title       = trim($data['title']       ?? '');
    $body        = trim($data['body']        ?? '');
    $uploaded_by = (int)($data['uploaded_by'] ?? 0);

    if (!$title || !$body) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Title and body are required']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO content (title, body, uploaded_by) VALUES (?, ?, ?)');
    $stmt->bind_param('ssi', $title, $body, $uploaded_by);

    if ($stmt->execute()) {
        $stmt->close();
        $stmt2 = $db->prepare('UPDATE users SET points = points + 10 WHERE id = ?');
        $stmt2->bind_param('i', $uploaded_by);
        $stmt2->execute();
        $stmt2->close();
        echo json_encode(['success' => true]);
    } else {
        $stmt->close();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Upload failed']);
    }
}
