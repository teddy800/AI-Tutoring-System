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
  category VARCHAR(100) DEFAULT 'General',
  students INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer INT NOT NULL,
  explanation TEXT,
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

-- ── 30 Courses ────────────────────────────────────────────────────────────────
INSERT INTO courses (id, title, description, difficulty, duration, rating, emoji, category, students) VALUES
(1,  'Introduction to Python',        'Master Python fundamentals — variables, functions, OOP and more.',                          'Beginner',     '4 weeks',  4.8, '🐍', 'Programming',   12400),
(2,  'Advanced Python',               'Decorators, generators, async/await, metaclasses and design patterns.',                     'Advanced',     '6 weeks',  4.9, '🔥', 'Programming',    8200),
(3,  'Calculus Fundamentals',         'Derivatives, integrals, and limits — the language of change.',                              'Intermediate', '4 weeks',  4.6, '📐', 'Mathematics',    9100),
(4,  'Linear Algebra',                'Vectors, matrices, eigenvalues — the backbone of ML and graphics.',                         'Intermediate', '5 weeks',  4.7, '🔢', 'Mathematics',    7300),
(5,  'Statistics & Probability',      'Distributions, hypothesis testing, Bayesian thinking and more.',                            'Intermediate', '5 weeks',  4.8, '📊', 'Mathematics',    8800),
(6,  'Web Development Bootcamp',      'Build stunning modern web apps with HTML, CSS, JavaScript and React.',                      'Beginner',     '8 weeks',  4.9, '🌐', 'Web Dev',       15600),
(7,  'React & Next.js',               'Component architecture, hooks, SSR, and full-stack React apps.',                            'Intermediate', '6 weeks',  4.9, '⚛️', 'Web Dev',       11200),
(8,  'Node.js & Express',             'Server-side JavaScript, REST APIs, middleware and authentication.',                         'Intermediate', '5 weeks',  4.7, '🟢', 'Web Dev',        9400),
(9,  'Machine Learning Basics',       'Understand ML algorithms, data preprocessing, and model evaluation.',                       'Advanced',     '6 weeks',  4.7, '🤖', 'AI/ML',          7800),
(10, 'Deep Learning & Neural Nets',   'CNNs, RNNs, transformers — build and train neural networks from scratch.',                  'Advanced',     '8 weeks',  4.8, '🧠', 'AI/ML',          6200),
(11, 'Natural Language Processing',   'Text classification, sentiment analysis, embeddings and LLMs.',                             'Advanced',     '6 weeks',  4.7, '💬', 'AI/ML',          5400),
(12, 'Cybersecurity Essentials',      'Ethical hacking, network security, cryptography and OWASP Top 10.',                        'Intermediate', '5 weeks',  4.5, '🔐', 'Security',       6900),
(13, 'Data Science with Python',      'Pandas, NumPy, Matplotlib — turn raw data into actionable insights.',                      'Intermediate', '5 weeks',  4.8, '📈', 'Data Science',   9700),
(14, 'SQL & Database Design',         'Relational databases, complex queries, indexing and normalization.',                        'Beginner',     '4 weeks',  4.6, '🗄️', 'Databases',      8300),
(15, 'Docker & Kubernetes',           'Containerization, orchestration, CI/CD pipelines and cloud deployment.',                   'Advanced',     '5 weeks',  4.7, '🐳', 'DevOps',         5100),
(16, 'Git & GitHub Mastery',          'Version control, branching strategies, pull requests and open source.',                    'Beginner',     '2 weeks',  4.8, '🌿', 'DevOps',        13200),
(17, 'TypeScript Deep Dive',          'Type system, generics, decorators and advanced TypeScript patterns.',                       'Intermediate', '4 weeks',  4.8, '🔷', 'Programming',    7600),
(18, 'Algorithms & Data Structures',  'Arrays, trees, graphs, sorting, dynamic programming — ace any interview.',                 'Intermediate', '6 weeks',  4.9, '⚡', 'CS Fundamentals',10400),
(19, 'System Design',                 'Scalable architectures, load balancing, caching, microservices.',                          'Advanced',     '5 weeks',  4.8, '🏗️', 'CS Fundamentals', 6700),
(20, 'Cloud Computing (AWS)',         'EC2, S3, Lambda, RDS — build and deploy on Amazon Web Services.',                          'Intermediate', '6 weeks',  4.6, '☁️', 'Cloud',           7200),
(21, 'Flutter & Dart',                'Cross-platform mobile apps for iOS and Android with Flutter.',                              'Intermediate', '6 weeks',  4.7, '📱', 'Mobile',          5800),
(22, 'iOS Development (Swift)',       'SwiftUI, UIKit, Core Data — build native iPhone and iPad apps.',                           'Intermediate', '7 weeks',  4.6, '🍎', 'Mobile',          4300),
(23, 'Blockchain & Web3',             'Smart contracts, Solidity, DeFi, NFTs and decentralized apps.',                            'Advanced',     '6 weeks',  4.5, '⛓️', 'Blockchain',      3900),
(24, 'Computer Vision',               'Image processing, object detection, OpenCV and YOLO models.',                              'Advanced',     '6 weeks',  4.7, '👁️', 'AI/ML',           4600),
(25, 'Rust Programming',              'Memory safety, ownership, lifetimes and systems programming in Rust.',                     'Advanced',     '7 weeks',  4.8, '🦀', 'Programming',     3700),
(26, 'GraphQL & APIs',                'Schema design, resolvers, subscriptions and REST vs GraphQL.',                              'Intermediate', '3 weeks',  4.6, '🔗', 'Web Dev',         5200),
(27, 'Linux & Shell Scripting',       'Command line mastery, bash scripting, process management and cron.',                       'Beginner',     '3 weeks',  4.7, '🐧', 'DevOps',          8100),
(28, 'Discrete Mathematics',          'Logic, sets, graph theory, combinatorics and proofs.',                                     'Intermediate', '5 weeks',  4.5, '🔣', 'Mathematics',     4800),
(29, 'UI/UX Design Principles',       'User research, wireframing, Figma, accessibility and design systems.',                     'Beginner',     '4 weeks',  4.8, '🎨', 'Design',          9300),
(30, 'Quantum Computing Intro',       'Qubits, superposition, entanglement and quantum algorithms.',                              'Advanced',     '5 weeks',  4.6, '⚛️', 'Science',         2800)
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), students=VALUES(students);


-- ── 120 Quizzes ───────────────────────────────────────────────────────────────
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
-- Python (1-15)
(1,  'What is the output of print(2 ** 3)?',                                    '["6","8","9","Error"]',                                                                    1, '2**3 means 2 to the power of 3 = 8',                                          'Easy',   'Python'),
(2,  'Which keyword is used to define a function in Python?',                   '["func","define","def","function"]',                                                       2, 'Python uses def to declare functions',                                         'Easy',   'Python'),
(3,  'What does len([1,2,3]) return?',                                          '["2","3","4","Error"]',                                                                    1, 'len() returns the number of items in a list',                                  'Easy',   'Python'),
(4,  'Which of these is a mutable data type in Python?',                        '["tuple","string","list","int"]',                                                          2, 'Lists are mutable; tuples and strings are immutable',                          'Easy',   'Python'),
(5,  'What is the output of type(3.14)?',                                       '["int","float","double","number"]',                                                        1, '3.14 is a floating-point number',                                              'Easy',   'Python'),
(6,  'Which method adds an element to the end of a list?',                      '["add()","push()","append()","insert()"]',                                                 2, 'list.append(x) adds x to the end',                                            'Easy',   'Python'),
(7,  'What does the range(5) function produce?',                                '["1 to 5","0 to 5","0 to 4","1 to 4"]',                                                   2, 'range(5) generates 0,1,2,3,4',                                                'Easy',   'Python'),
(8,  'What is a lambda function?',                                              '["A named function","An anonymous function","A class method","A built-in function"]',      1, 'Lambda creates small anonymous functions inline',                              'Medium', 'Python'),
(9,  'What does *args allow in a function?',                                    '["Keyword arguments","Variable positional arguments","Default values","Return multiple"]', 1, '*args collects extra positional arguments as a tuple',                         'Medium', 'Python'),
(10, 'What is the output of [x**2 for x in range(3)]?',                        '["[1,4,9]","[0,1,4]","[0,1,2]","[1,2,3]"]',                                               1, 'List comprehension: 0²=0, 1²=1, 2²=4',                                        'Medium', 'Python'),
(11, 'Which decorator makes a method a class method?',                          '["@staticmethod","@classmethod","@property","@method"]',                                  1, '@classmethod receives cls as first argument',                                  'Medium', 'Python'),
(12, 'What does yield do in a function?',                                       '["Returns a value","Creates a generator","Raises exception","Imports module"]',            1, 'yield turns a function into a generator',                                      'Hard',   'Python'),
(13, 'What is the GIL in Python?',                                              '["Global Import Lock","Global Interpreter Lock","General Interface Layer","None"]',        1, 'GIL prevents multiple threads from executing Python bytecode simultaneously',  'Hard',   'Python'),
(14, 'What does __slots__ do in a class?',                                      '["Adds methods","Restricts attributes","Enables inheritance","Creates properties"]',       1, '__slots__ restricts instance attributes, saving memory',                       'Hard',   'Python'),
(15, 'What is the output of bool("") in Python?',                               '["True","False","None","Error"]',                                                          1, 'Empty string is falsy in Python',                                              'Easy',   'Python');

-- JavaScript (16-28)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(16, 'Which keyword declares a block-scoped variable in JS?',                   '["var","let","const","function"]',                                                         1, 'let is block-scoped; var is function-scoped',                                  'Easy',   'JavaScript'),
(17, 'What does === check in JavaScript?',                                      '["Value only","Type only","Value and type","Reference"]',                                  2, '=== is strict equality checking both value and type',                          'Easy',   'JavaScript'),
(18, 'What is the output of typeof null?',                                      '["null","undefined","object","string"]',                                                   2, 'typeof null returns "object" — a known JS quirk',                              'Medium', 'JavaScript'),
(19, 'What does Array.map() return?',                                           '["The original array","A new array","undefined","A boolean"]',                             1, 'map() returns a new array with transformed elements',                          'Easy',   'JavaScript'),
(20, 'What is a Promise in JavaScript?',                                        '["A loop","An async operation placeholder","A class","A variable"]',                       1, 'Promises represent eventual completion of async operations',                   'Medium', 'JavaScript'),
(21, 'What does the spread operator (...) do?',                                 '["Deletes elements","Expands iterables","Creates loops","Imports modules"]',               1, 'Spread expands arrays/objects into individual elements',                       'Medium', 'JavaScript'),
(22, 'What is event bubbling?',                                                 '["Events fire on parent first","Events fire on child first","Events cancel","None"]',      1, 'Bubbling: events propagate from child up to parent elements',                  'Medium', 'JavaScript'),
(23, 'What does async/await do?',                                               '["Creates threads","Simplifies Promise handling","Blocks execution","None"]',              1, 'async/await makes asynchronous code look synchronous',                         'Medium', 'JavaScript'),
(24, 'What is closure in JavaScript?',                                          '["A loop","Function with access to outer scope","A class","An error"]',                    1, 'Closures remember the scope in which they were created',                       'Hard',   'JavaScript'),
(25, 'What does Object.freeze() do?',                                           '["Deletes object","Makes object immutable","Copies object","Sorts object"]',               1, 'freeze() prevents adding, removing, or modifying properties',                  'Medium', 'JavaScript'),
(26, 'What is the prototype chain?',                                            '["Array methods","Inheritance mechanism","Event system","Module system"]',                 1, 'JS uses prototype chain for inheritance between objects',                      'Hard',   'JavaScript'),
(27, 'What does JSON.stringify() do?',                                          '["Parses JSON","Converts object to JSON string","Validates JSON","Deletes JSON"]',         1, 'stringify() serializes a JS object to a JSON string',                          'Easy',   'JavaScript'),
(28, 'What is the difference between null and undefined?',                      '["Same thing","null is assigned, undefined is not","undefined is assigned","None"]',      1, 'null is intentional absence; undefined means not yet assigned',                'Medium', 'JavaScript');

-- Calculus & Math (29-42)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(29, 'What is the derivative of sin(x)?',                                       '["cos(x)","-cos(x)","sin(x)","-sin(x)"]',                                                  0, 'd/dx sin(x) = cos(x)',                                                         'Medium', 'Calculus'),
(30, 'What is the integral of 2x dx?',                                          '["x²","x² + C","2x² + C","x + C"]',                                                       1, '∫2x dx = x² + C',                                                             'Medium', 'Calculus'),
(31, 'What is the derivative of e^x?',                                          '["e^x","xe^x","e^(x-1)","1"]',                                                             0, 'e^x is its own derivative',                                                    'Easy',   'Calculus'),
(32, 'What does the limit lim(x→0) sin(x)/x equal?',                           '["0","1","∞","undefined"]',                                                                1, 'This is a fundamental limit equal to 1',                                       'Hard',   'Calculus'),
(33, 'What is the chain rule used for?',                                        '["Adding derivatives","Differentiating composite functions","Integration","Limits"]',      1, 'Chain rule: d/dx[f(g(x))] = f\'(g(x))·g\'(x)',                                'Medium', 'Calculus'),
(34, 'What is the area under a curve called?',                                  '["Derivative","Integral","Limit","Gradient"]',                                             1, 'Definite integrals compute the area under a curve',                            'Easy',   'Calculus'),
(35, 'What is a matrix determinant used for?',                                  '["Adding matrices","Checking invertibility","Transposing","Multiplying"]',                 1, 'det(A) ≠ 0 means the matrix is invertible',                                   'Medium', 'Linear Algebra'),
(36, 'What are eigenvalues?',                                                   '["Matrix rows","Scalars in Av=λv","Matrix columns","Diagonal entries"]',                   1, 'Eigenvalues λ satisfy Av = λv for eigenvector v',                              'Hard',   'Linear Algebra'),
(37, 'What is the dot product of [1,0] and [0,1]?',                            '["1","0","2","-1"]',                                                                       1, 'Orthogonal vectors have dot product = 0',                                      'Easy',   'Linear Algebra'),
(38, 'What is a normal distribution?',                                          '["Skewed curve","Bell-shaped symmetric curve","Uniform distribution","Bimodal curve"]',    1, 'Normal distribution is symmetric around the mean',                             'Easy',   'Statistics'),
(39, 'What does p-value represent?',                                            '["Effect size","Probability of results given null hypothesis","Sample size","Variance"]',  1, 'p-value < 0.05 typically rejects the null hypothesis',                         'Medium', 'Statistics'),
(40, 'What is standard deviation?',                                             '["Mean of data","Spread of data around mean","Maximum value","Minimum value"]',            1, 'SD measures how spread out values are from the mean',                          'Easy',   'Statistics'),
(41, 'What is Bayes theorem used for?',                                         '["Sorting data","Updating probability with new evidence","Regression","Clustering"]',      1, 'P(A|B) = P(B|A)·P(A)/P(B)',                                                   'Hard',   'Statistics'),
(42, 'What is the median of [3,1,4,1,5]?',                                     '["1","3","4","2.8"]',                                                                      1, 'Sorted: [1,1,3,4,5] — middle value is 3',                                     'Easy',   'Statistics');

-- Web Dev & CSS (43-55)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(43, 'Which HTML tag creates a hyperlink?',                                     '["<link>","<a>","<href>","<url>"]',                                                        1, '<a href="..."> creates clickable hyperlinks',                                  'Easy',   'Web Dev'),
(44, 'What does CSS stand for?',                                                '["Computer Style Sheets","Creative Style Syntax","Cascading Style Sheets","Colorful"]',   2, 'CSS = Cascading Style Sheets',                                                 'Easy',   'Web Dev'),
(45, 'What is the CSS box model?',                                              '["Color system","Content+padding+border+margin","Grid system","Flexbox"]',                 1, 'Box model: content, padding, border, margin layers',                           'Easy',   'Web Dev'),
(46, 'What does display:flex do?',                                              '["Hides element","Creates flex container","Adds animation","Removes element"]',            1, 'Flexbox enables powerful 1D layout control',                                   'Easy',   'Web Dev'),
(47, 'What is the purpose of z-index?',                                         '["Font size","Stacking order of elements","Zoom level","Border width"]',                   1, 'z-index controls which element appears on top',                                'Medium', 'Web Dev'),
(48, 'What does position:absolute do?',                                         '["Stays in flow","Positions relative to nearest positioned ancestor","Fixed to viewport","None"]', 1, 'absolute removes element from normal flow',                            'Medium', 'Web Dev'),
(49, 'What is a CSS pseudo-class?',                                             '["A fake class","Selects elements in a specific state","A variable","An animation"]',     1, 'Examples: :hover, :focus, :nth-child()',                                       'Medium', 'Web Dev'),
(50, 'What does the viewport meta tag do?',                                     '["Sets font","Controls layout on mobile devices","Adds favicon","Sets language"]',         1, 'viewport meta enables responsive design on mobile',                            'Easy',   'Web Dev'),
(51, 'What is semantic HTML?',                                                  '["Styled HTML","HTML with meaningful tags","Compressed HTML","Animated HTML"]',            1, 'Semantic tags like <article>, <nav> describe content meaning',                 'Easy',   'Web Dev'),
(52, 'What does CORS stand for?',                                               '["Cross-Origin Resource Sharing","Client Object Request System","None","Code Object"]',   0, 'CORS controls cross-origin HTTP requests',                                     'Medium', 'Web Dev'),
(53, 'What is a REST API?',                                                     '["A database","Architectural style for web services","A framework","A language"]',         1, 'REST uses HTTP methods: GET, POST, PUT, DELETE',                               'Medium', 'Web Dev'),
(54, 'What does localStorage store?',                                           '["Server data","Key-value pairs in browser","Cookies","Session tokens only"]',             1, 'localStorage persists data in the browser indefinitely',                       'Easy',   'Web Dev'),
(55, 'What is the difference between GET and POST?',                            '["No difference","GET retrieves, POST sends data","POST retrieves, GET sends","None"]',    1, 'GET is idempotent; POST submits data to server',                               'Easy',   'Web Dev');

-- Algorithms & Data Structures (56-68)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(56, 'What is the time complexity of binary search?',                           '["O(n)","O(n²)","O(log n)","O(1)"]',                                                       2, 'Binary search halves the search space each step',                             'Medium', 'Algorithms'),
(57, 'What data structure uses LIFO order?',                                    '["Queue","Stack","Heap","Graph"]',                                                          1, 'Stack: Last In, First Out',                                                    'Easy',   'Algorithms'),
(58, 'What is the worst-case time of quicksort?',                               '["O(n log n)","O(n)","O(n²)","O(log n)"]',                                                 2, 'Quicksort degrades to O(n²) with bad pivot selection',                         'Hard',   'Algorithms'),
(59, 'What is a hash table?',                                                   '["Sorted array","Key-value store with O(1) lookup","Linked list","Binary tree"]',          1, 'Hash tables use hash functions for near-constant lookup',                      'Medium', 'Algorithms'),
(60, 'What is dynamic programming?',                                            '["Random algorithms","Solving problems by breaking into subproblems","Sorting","Graphs"]', 1, 'DP stores subproblem results to avoid recomputation',                          'Hard',   'Algorithms'),
(61, 'What is a binary search tree property?',                                  '["Left > root > right","Left < root < right","All equal","Random order"]',                 1, 'BST: left subtree < node < right subtree',                                     'Medium', 'Algorithms'),
(62, 'What is BFS used for?',                                                   '["Sorting","Shortest path in unweighted graph","Compression","Encryption"]',               1, 'BFS explores level by level, finding shortest paths',                          'Medium', 'Algorithms'),
(63, 'What is the space complexity of merge sort?',                             '["O(1)","O(log n)","O(n)","O(n²)"]',                                                       2, 'Merge sort requires O(n) extra space for merging',                             'Hard',   'Algorithms'),
(64, 'What is a greedy algorithm?',                                             '["Tries all options","Makes locally optimal choice at each step","Uses recursion","None"]', 1, 'Greedy picks the best option at each step without backtracking',               'Medium', 'Algorithms'),
(65, 'What is a linked list?',                                                  '["Array with indices","Nodes connected by pointers","Hash table","Binary tree"]',          1, 'Each node stores data and a pointer to the next node',                         'Easy',   'Algorithms'),
(66, 'What is the time complexity of accessing an array element?',              '["O(n)","O(log n)","O(1)","O(n²)"]',                                                       2, 'Array access by index is constant time O(1)',                                  'Easy',   'Algorithms'),
(67, 'What is Dijkstra\'s algorithm used for?',                                 '["Sorting","Shortest path in weighted graph","String matching","Compression"]',            1, 'Dijkstra finds shortest paths from a source node',                             'Hard',   'Algorithms'),
(68, 'What is a heap data structure?',                                          '["Sorted array","Complete binary tree with heap property","Hash table","Stack"]',          1, 'Min-heap: parent ≤ children; Max-heap: parent ≥ children',                    'Medium', 'Algorithms');

-- Machine Learning & AI (69-80)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(69, 'What is supervised learning?',                                            '["Learning without labels","Learning with labeled data","Reinforcement","Clustering"]',   1, 'Supervised learning trains on input-output pairs',                             'Easy',   'Machine Learning'),
(70, 'What is overfitting?',                                                    '["Model too simple","Model memorizes training data","Model ignores data","None"]',         1, 'Overfitting: great on training, poor on new data',                             'Medium', 'Machine Learning'),
(71, 'What does gradient descent do?',                                          '["Increases loss","Minimizes loss function iteratively","Sorts data","Clusters data"]',   1, 'Gradient descent updates weights to minimize loss',                            'Medium', 'Machine Learning'),
(72, 'What is a confusion matrix?',                                             '["Data table","Performance table showing TP,FP,TN,FN","Loss function","Activation"]',    1, 'Confusion matrix shows classification performance',                            'Medium', 'Machine Learning'),
(73, 'What activation function outputs 0 or 1?',                               '["ReLU","Sigmoid","Tanh","Softmax"]',                                                      1, 'Sigmoid squashes values to (0,1) range',                                       'Medium', 'Machine Learning'),
(74, 'What is a convolutional neural network used for?',                        '["Text","Images and spatial data","Audio only","Tabular data"]',                          1, 'CNNs excel at image recognition tasks',                                        'Medium', 'Machine Learning'),
(75, 'What is transfer learning?',                                              '["Training from scratch","Using pretrained model on new task","Data augmentation","None"]', 1, 'Transfer learning reuses knowledge from pretrained models',                   'Hard',   'Machine Learning'),
(76, 'What is the purpose of dropout in neural networks?',                      '["Speed up training","Prevent overfitting","Increase accuracy","Add layers"]',            1, 'Dropout randomly disables neurons during training',                            'Hard',   'Machine Learning'),
(77, 'What is k-means clustering?',                                             '["Supervised algorithm","Unsupervised grouping into k clusters","Regression","None"]',    1, 'k-means partitions data into k groups by centroid distance',                   'Medium', 'Machine Learning'),
(78, 'What does LSTM stand for?',                                               '["Long Short-Term Memory","Large Scale Training Model","Linear Sequential TM","None"]',   0, 'LSTMs handle long-range dependencies in sequences',                            'Hard',   'Machine Learning'),
(79, 'What is the vanishing gradient problem?',                                 '["Gradients too large","Gradients become tiny, stopping learning","Data issue","None"]',  1, 'Deep networks suffer from gradients shrinking to near zero',                   'Hard',   'Machine Learning'),
(80, 'What is a transformer model?',                                            '["CNN variant","Attention-based sequence model","RNN variant","Decision tree"]',          1, 'Transformers use self-attention — basis of GPT, BERT',                         'Hard',   'Machine Learning');

-- Databases & SQL (81-90)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(81, 'What does SQL stand for?',                                                '["Structured Query Language","Simple Query Logic","Standard Query List","Sequential"]',   0, 'SQL is the standard language for relational databases',                        'Easy',   'Databases'),
(82, 'What does SELECT * FROM users do?',                                       '["Deletes all users","Retrieves all columns from users","Updates users","Creates table"]', 1, 'SELECT * retrieves all columns from the specified table',                      'Easy',   'Databases'),
(83, 'What is a PRIMARY KEY?',                                                  '["Any column","Unique identifier for each row","Foreign reference","Index"]',             1, 'Primary key uniquely identifies each record',                                  'Easy',   'Databases'),
(84, 'What is a JOIN in SQL?',                                                  '["Deletes tables","Combines rows from multiple tables","Creates index","Sorts data"]',    1, 'JOIN combines rows from two or more tables',                                   'Medium', 'Databases'),
(85, 'What is database normalization?',                                         '["Backing up data","Organizing to reduce redundancy","Encrypting data","Indexing"]',      1, 'Normalization eliminates data redundancy and anomalies',                       'Medium', 'Databases'),
(86, 'What does ACID stand for in databases?',                                  '["Atomicity,Consistency,Isolation,Durability","Auto,Cache,Index,Data","None","All"]',     0, 'ACID ensures reliable database transactions',                                  'Hard',   'Databases'),
(87, 'What is an index in a database?',                                         '["A table","Data structure that speeds up queries","A constraint","A view"]',             1, 'Indexes allow faster data retrieval at cost of storage',                       'Medium', 'Databases'),
(88, 'What is the difference between WHERE and HAVING?',                        '["Same thing","WHERE filters rows, HAVING filters groups","HAVING filters rows","None"]', 1, 'HAVING is used with GROUP BY to filter aggregated results',                    'Medium', 'Databases'),
(89, 'What is a NoSQL database?',                                               '["SQL database","Non-relational database","Encrypted database","In-memory only"]',        1, 'NoSQL: MongoDB, Redis — flexible schema, horizontal scale',                    'Medium', 'Databases'),
(90, 'What does GROUP BY do in SQL?',                                           '["Sorts results","Groups rows with same values","Joins tables","Filters rows"]',          1, 'GROUP BY aggregates rows with identical column values',                        'Medium', 'Databases');

-- Cybersecurity (91-100)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(91, 'What is SQL injection?',                                                  '["A database type","Attack inserting malicious SQL","A query optimizer","None"]',         1, 'SQL injection exploits unsanitized user input in queries',                     'Medium', 'Cybersecurity'),
(92, 'What does HTTPS provide over HTTP?',                                      '["Faster speed","Encrypted communication","Larger files","None"]',                        1, 'HTTPS uses TLS/SSL to encrypt data in transit',                                'Easy',   'Cybersecurity'),
(93, 'What is a man-in-the-middle attack?',                                     '["Server attack","Intercepting communication between two parties","DDoS","Phishing"]',   1, 'MITM attacker secretly relays/alters communications',                          'Medium', 'Cybersecurity'),
(94, 'What is two-factor authentication?',                                      '["Two passwords","Two verification methods","Two accounts","Two servers"]',               1, '2FA requires something you know + something you have',                         'Easy',   'Cybersecurity'),
(95, 'What is a DDoS attack?',                                                  '["Data deletion","Overwhelming server with traffic","Password theft","Injection"]',       1, 'DDoS floods target with traffic to cause downtime',                            'Easy',   'Cybersecurity'),
(96, 'What is XSS (Cross-Site Scripting)?',                                     '["CSS attack","Injecting malicious scripts into web pages","SQL attack","None"]',         1, 'XSS injects scripts that run in victims browsers',                             'Medium', 'Cybersecurity'),
(97, 'What is a firewall?',                                                     '["A virus","Network security system monitoring traffic","A database","An OS"]',           1, 'Firewalls filter incoming/outgoing network traffic',                           'Easy',   'Cybersecurity'),
(98, 'What is encryption?',                                                     '["Deleting data","Converting data to unreadable format","Compressing data","Copying"]',   1, 'Encryption protects data confidentiality',                                     'Easy',   'Cybersecurity'),
(99, 'What is a zero-day vulnerability?',                                       '["Old bug","Unknown flaw with no patch available","Fixed bug","Feature"]',                1, 'Zero-day: vendor unaware, no patch exists yet',                                'Hard',   'Cybersecurity'),
(100,'What does the principle of least privilege mean?',                        '["Admin access for all","Users get minimum access needed","No passwords","Open access"]', 1, 'PoLP limits access rights to only what is necessary',                          'Medium', 'Cybersecurity');

-- DevOps, Cloud & Git (101-112)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(101,'What is a Docker container?',                                             '["Virtual machine","Lightweight isolated process environment","Database","OS"]',           1, 'Containers package app + dependencies, share host OS kernel',                  'Medium', 'DevOps'),
(102,'What does git commit do?',                                                '["Uploads to GitHub","Saves snapshot of staged changes","Deletes files","Merges"]',       1, 'git commit records staged changes to local repository',                        'Easy',   'Git'),
(103,'What is a git branch?',                                                   '["A commit","Parallel line of development","A merge","A tag"]',                           1, 'Branches allow isolated feature development',                                  'Easy',   'Git'),
(104,'What does git rebase do?',                                                '["Deletes commits","Moves commits to new base","Creates branch","Merges files"]',         1, 'Rebase replays commits on top of another branch',                              'Hard',   'Git'),
(105,'What is CI/CD?',                                                          '["A language","Continuous Integration/Continuous Deployment","A database","None"]',        1, 'CI/CD automates testing and deployment pipelines',                             'Medium', 'DevOps'),
(106,'What is Kubernetes used for?',                                            '["Writing code","Orchestrating containers at scale","Database management","None"]',        1, 'Kubernetes automates deployment, scaling of containers',                       'Medium', 'DevOps'),
(107,'What is Infrastructure as Code?',                                         '["Writing apps","Managing infrastructure via code files","Monitoring","None"]',            1, 'IaC tools: Terraform, Ansible, CloudFormation',                                'Medium', 'DevOps'),
(108,'What is AWS S3?',                                                         '["Compute service","Object storage service","Database","CDN"]',                           1, 'S3 stores objects (files) with high durability',                               'Easy',   'Cloud'),
(109,'What is serverless computing?',                                           '["No servers exist","Cloud manages servers, you deploy functions","Local only","None"]',   1, 'Serverless: AWS Lambda, Azure Functions — pay per execution',                  'Medium', 'Cloud'),
(110,'What does git pull do?',                                                  '["Pushes changes","Fetches and merges remote changes","Creates branch","Deletes"]',        1, 'git pull = git fetch + git merge',                                             'Easy',   'Git'),
(111,'What is a load balancer?',                                                '["A database","Distributes traffic across multiple servers","A firewall","None"]',         1, 'Load balancers prevent any single server from overloading',                    'Medium', 'DevOps'),
(112,'What is the purpose of environment variables?',                           '["Store code","Store configuration outside source code","Log errors","None"]',            1, 'Env vars keep secrets and config out of codebase',                             'Easy',   'DevOps');

-- TypeScript, React & System Design (113-120)
INSERT INTO quizzes (id, question, options, correct_answer, explanation, difficulty, topic) VALUES
(113,'What is TypeScript?',                                                     '["A framework","Typed superset of JavaScript","A database","A CSS preprocessor"]',        1, 'TypeScript adds static types to JavaScript',                                   'Easy',   'TypeScript'),
(114,'What is a TypeScript interface?',                                         '["A class","Contract defining object shape","A function","A module"]',                    1, 'Interfaces define the structure objects must follow',                          'Medium', 'TypeScript'),
(115,'What is a React hook?',                                                   '["A lifecycle method","Function to use state in functional components","A class","None"]', 1, 'Hooks like useState, useEffect add features to functions',                    'Medium', 'React'),
(116,'What does useEffect do in React?',                                        '["Renders UI","Runs side effects after render","Creates state","None"]',                  1, 'useEffect handles data fetching, subscriptions, DOM updates',                  'Medium', 'React'),
(117,'What is virtual DOM in React?',                                           '["Real DOM","In-memory representation of real DOM","A database","None"]',                 1, 'Virtual DOM enables efficient UI updates via diffing',                         'Medium', 'React'),
(118,'What is a microservice architecture?',                                    '["Monolith","Small independent services communicating via APIs","A database","None"]',     1, 'Microservices enable independent scaling and deployment',                      'Hard',   'System Design'),
(119,'What is CAP theorem?',                                                    '["A sorting algorithm","Consistency, Availability, Partition tolerance tradeoff","None","SQL"]', 1, 'Distributed systems can guarantee only 2 of 3 CAP properties', 'Hard',   'System Design'),
(120,'What is eventual consistency?',                                           '["Immediate sync","System becomes consistent over time","No consistency","None"]',         1, 'Eventual consistency: all nodes converge to same state eventually',            'Hard',   'System Design');

-- ── Final counts ──────────────────────────────────────────────────────────────
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS total_courses FROM courses;
SELECT COUNT(*) AS total_quizzes FROM quizzes;
