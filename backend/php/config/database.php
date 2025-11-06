<?php
namespace Config;

class Database {
    private $host = 'localhost';
    private $user = 'root';
    private $pass = '';
    private $dbname = 'tutoring_system';
    private $conn;

    public function connect() {
        try {
            $this->conn = new \mysqli($this->host, $this->user, $this->pass, $this->dbname);
            if ($this->conn->connect_error) {
                throw new \Exception('Database connection failed: ' . $this->conn->connect_error);
            }
            $this->conn->set_charset('utf8mb4');
            return $this->conn;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }
}