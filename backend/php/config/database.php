<?php
namespace Config;

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

class Database {
    private string $host;
    private string $user;
    private string $pass;
    private string $dbname;

    public function __construct() {
        $this->host   = $_ENV['DB_HOST']     ?? 'localhost';
        $this->user   = $_ENV['DB_USER']     ?? 'root';
        $this->pass   = $_ENV['DB_PASSWORD'] ?? '';
        $this->dbname = $_ENV['DB_NAME']     ?? 'tutoring_system';
    }

    public function connect(): \mysqli {
        try {
            $conn = new \mysqli($this->host, $this->user, $this->pass, $this->dbname);
            if ($conn->connect_error) {
                throw new \Exception('Database connection failed: ' . $conn->connect_error);
            }
            $conn->set_charset('utf8mb4');
            return $conn;
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }
}
