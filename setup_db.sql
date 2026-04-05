CREATE DATABASE IF NOT EXISTS tutoring_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tutoring_system;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type ENUM('student','tutor') DEFAULT 'student',
  points INT DEFAULT 0,
  streak INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50) DEFAULT 'Beginner',
  duration VARCHAR(50) DEFAULT '4 weeks',
  rating DECIMAL(3,1) DEFAULT 4.5,
  emoji VARCHAR(10) DEFAULT '📚',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer INT NOT NULL,
  difficulty VARCHAR(50) DEFAULT 'Easy',
  topic VARCHAR(100) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  score INT NOT NULL,
  topic VARCHAR(100) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  uploaded_by INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT 0,
  type VARCHAR(50) DEFAULT 'general',
  message TEXT NOT NULL,
  rating INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  progress INT DEFAULT 0,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_enrollment (user_id, course_id)
);

-- Sample courses
INSERT IGNORE INTO courses (id, title, description, difficulty, duration, rating, emoji) VALUES
(1, 'Introduction to Python', 'Master Python fundamentals — variables, functions, OOP and more.', 'Beginner', '4 weeks', 4.8, '🐍'),
(2, 'Calculus Fundamentals', 'Derivatives, integrals, and limits — the language of change.', 'Intermediate', '4 weeks', 4.6, '📐'),
(3, 'Web Development', 'Build stunning modern web apps with HTML, CSS, and JavaScript.', 'Beginner', '4 weeks', 4.9, '🌐'),
(4, 'Machine Learning Basics', 'Understand ML algorithms, data preprocessing, and model evaluation.', 'Advanced', '4 weeks', 4.7, '🤖'),
(5, 'Cybersecurity Essentials', 'Learn ethical hacking, network security, and cryptography basics.', 'Intermediate', '3 weeks', 4.5, '🔐'),
(6, 'Data Science with Python', 'Pandas, NumPy, Matplotlib — turn raw data into insights.', 'Intermediate', '5 weeks', 4.8, '📊');

-- Sample quizzes
INSERT IGNORE INTO quizzes (id, question, options, correct_answer, difficulty, topic) VALUES
(1, 'What is the output of print(2 ** 3) in Python?', '["6","8","9","Error"]', 1, 'Easy', 'Python'),
(2, 'What is the derivative of sin(x)?', '["cos(x)","-cos(x)","sin(x)","-sin(x)"]', 0, 'Medium', 'Calculus'),
(3, 'Which HTML tag creates a hyperlink?', '["<link>","<a>","<href>","<url>"]', 1, 'Easy', 'Web Dev'),
(4, 'What does CSS stand for?', '["Computer Style Sheets","Creative Style Syntax","Cascading Style Sheets","Colorful Style Sheets"]', 2, 'Easy', 'Web Dev'),
(5, 'What is the time complexity of binary search?', '["O(n)","O(n²)","O(log n)","O(1)"]', 2, 'Medium', 'Algorithms'),
(6, 'Which keyword declares a constant in JavaScript?', '["var","let","const","def"]', 2, 'Easy', 'JavaScript'),
(7, 'What does SQL stand for?', '["Structured Query Language","Simple Query Logic","Standard Query List","Sequential Query Language"]', 0, 'Easy', 'Databases'),
(8, 'What is the output of len([1,2,3]) in Python?', '["2","3","4","Error"]', 1, 'Easy', 'Python');

SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS total_courses FROM courses;
SELECT COUNT(*) AS total_quizzes FROM quizzes;
