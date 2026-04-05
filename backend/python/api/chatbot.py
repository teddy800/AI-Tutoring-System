from flask import Blueprint, request, jsonify, session
import re
import time

chatbot_bp = Blueprint('chatbot', __name__)

# ── In-memory chat history (per session) ─────────────────────────────────────
_chat_histories: dict = {}

# ── Knowledge base ────────────────────────────────────────────────────────────
KB = {
    # ── Python ────────────────────────────────────────────────────────────────
    r'what is python|python language|python overview': {
        'response': (
            "## 🐍 Python\n\n"
            "**Python** is a high-level, interpreted, dynamically-typed language known for clean syntax.\n\n"
            "**Key strengths:**\n"
            "- Web development (Django, Flask, FastAPI)\n"
            "- Data science (Pandas, NumPy, Matplotlib)\n"
            "- Machine learning (TensorFlow, PyTorch, scikit-learn)\n"
            "- Automation & scripting\n\n"
            "```python\n# Hello World\nprint('Hello, NeuralLearn! 🚀')\n```"
        ),
        'suggestions': ['Python variables', 'Python functions', 'Python OOP']
    },
    r'python variable|variable in python|python data type': {
        'response': (
            "## 📦 Python Variables\n\n"
            "Variables are dynamically typed — no declaration needed:\n\n"
            "```python\nx = 10          # int\nname = 'Alice'  # str\npi = 3.14       # float\nactive = True   # bool\ndata = [1,2,3]  # list\n```\n\n"
            "Use `type(x)` to check the type. Python uses **duck typing** — if it walks like a duck, it's a duck! 🦆"
        ),
        'suggestions': ['Python lists', 'Python dictionaries', 'Python functions']
    },
    r'python function|def keyword|define function|lambda': {
        'response': (
            "## ⚙️ Python Functions\n\n"
            "```python\n# Regular function\ndef greet(name, greeting='Hello'):\n    return f'{greeting}, {name}!'\n\n"
            "# Lambda (anonymous)\nsquare = lambda x: x ** 2\n\n"
            "# *args and **kwargs\ndef flexible(*args, **kwargs):\n    print(args, kwargs)\n```\n\n"
            "Functions are **first-class objects** — pass them as arguments, return them, store in variables!"
        ),
        'suggestions': ['Python decorators', 'Python classes', 'Python generators']
    },
    r'python class|oop python|object oriented|inheritance': {
        'response': (
            "## 🏗️ Python OOP\n\n"
            "```python\nclass Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return f'{self.name} makes a sound'\n\nclass Dog(Animal):\n    def speak(self):\n        return f'{self.name} says Woof!'\n\ndog = Dog('Rex')\nprint(dog.speak())  # Rex says Woof!\n```\n\n"
            "**Key concepts:** Encapsulation, Inheritance, Polymorphism, Abstraction"
        ),
        'suggestions': ['Python decorators', 'Python magic methods', 'Python dataclasses']
    },
    r'python list|list comprehension|python array': {
        'response': (
            "## 📋 Python Lists\n\n"
            "```python\nnums = [1, 2, 3, 4, 5]\n\n# List comprehension\nsquares = [x**2 for x in nums if x > 2]\n# [9, 16, 25]\n\n# Slicing\nprint(nums[1:3])   # [2, 3]\nprint(nums[::-1])  # [5, 4, 3, 2, 1]\n```\n\n"
            "**Key methods:** `.append()`, `.extend()`, `.pop()`, `.sort()`, `.reverse()`, `.index()`"
        ),
        'suggestions': ['Python tuples', 'Python sets', 'Python dictionaries']
    },
    r'python dict|dictionary python|python hashmap': {
        'response': (
            "## 🗂️ Python Dictionaries\n\n"
            "```python\nperson = {'name': 'Alice', 'age': 25}\n\n# Access\nprint(person['name'])        # Alice\nprint(person.get('email', 'N/A'))  # N/A\n\n# Dict comprehension\nsquares = {x: x**2 for x in range(5)}\n\n# Merge (Python 3.9+)\nmerged = dict1 | dict2\n```"
        ),
        'suggestions': ['Python sets', 'Python JSON', 'Python collections module']
    },
    r'python exception|try except|error handling': {
        'response': (
            "## ⚠️ Python Exception Handling\n\n"
            "```python\ntry:\n    result = 10 / 0\nexcept ZeroDivisionError as e:\n    print(f'Error: {e}')\nexcept (TypeError, ValueError):\n    print('Type or value error')\nelse:\n    print('No error!')\nfinally:\n    print('Always runs')\n\n# Custom exception\nclass AppError(Exception):\n    pass\n```"
        ),
        'suggestions': ['Python logging', 'Python context managers', 'Python debugging']
    },
    r'python decorator|@property|@staticmethod': {
        'response': (
            "## 🎨 Python Decorators\n\n"
            "```python\nimport functools\n\ndef timer(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        import time\n        start = time.time()\n        result = func(*args, **kwargs)\n        print(f'{func.__name__} took {time.time()-start:.2f}s')\n        return result\n    return wrapper\n\n@timer\ndef slow_function():\n    time.sleep(1)\n```"
        ),
        'suggestions': ['Python generators', 'Python context managers', 'Python metaclasses']
    },
    r'python generator|yield|iterator': {
        'response': (
            "## ⚡ Python Generators\n\n"
            "```python\n# Generator function\ndef fibonacci():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b\n\nfib = fibonacci()\nprint([next(fib) for _ in range(8)])\n# [0, 1, 1, 2, 3, 5, 8, 13]\n\n# Generator expression\neven_squares = (x**2 for x in range(10) if x % 2 == 0)\n```\n\n"
            "Generators are **memory-efficient** — they produce values on demand! 🚀"
        ),
        'suggestions': ['Python itertools', 'Python async', 'Python comprehensions']
    },

    # ── Calculus ───────────────────────────────────────────────────────────────
    r'derivative|differentiation|diff of|calculus derivative': {
        'response': (
            "## 📐 Derivatives\n\n"
            "**Derivatives** measure the instantaneous rate of change.\n\n"
            "**Key rules:**\n"
            "- Power rule: `d/dx(xⁿ) = nxⁿ⁻¹`\n"
            "- Chain rule: `d/dx[f(g(x))] = f'(g(x)) · g'(x)`\n"
            "- Product rule: `(uv)' = u'v + uv'`\n"
            "- Quotient rule: `(u/v)' = (u'v - uv') / v²`\n\n"
            "**Common derivatives:**\n"
            "- `d/dx(sin x) = cos x`\n"
            "- `d/dx(cos x) = -sin x`\n"
            "- `d/dx(eˣ) = eˣ`\n"
            "- `d/dx(ln x) = 1/x`"
        ),
        'suggestions': ['Integration', 'Chain rule examples', 'Limits']
    },
    r'integral|integration|antiderivative|area under curve': {
        'response': (
            "## ∫ Integration\n\n"
            "Integration finds the **area under a curve** and reverses differentiation.\n\n"
            "**Power rule:** `∫xⁿ dx = xⁿ⁺¹/(n+1) + C`\n\n"
            "**Common integrals:**\n"
            "- `∫sin x dx = -cos x + C`\n"
            "- `∫cos x dx = sin x + C`\n"
            "- `∫eˣ dx = eˣ + C`\n"
            "- `∫(1/x) dx = ln|x| + C`\n\n"
            "**Fundamental Theorem of Calculus:**\n"
            "`∫[a,b] f(x) dx = F(b) - F(a)` where F'(x) = f(x)"
        ),
        'suggestions': ['Integration by parts', 'U-substitution', 'Definite integrals']
    },
    r'limit|limits calculus|l.hopital': {
        'response': (
            "## 🎯 Limits\n\n"
            "`lim(x→a) f(x) = L` means f(x) approaches L as x approaches a.\n\n"
            "**L'Hôpital's Rule** (for 0/0 or ∞/∞ forms):\n"
            "`lim f(x)/g(x) = lim f'(x)/g'(x)`\n\n"
            "**Squeeze Theorem:** If `g(x) ≤ f(x) ≤ h(x)` and `lim g = lim h = L`, then `lim f = L`\n\n"
            "**Important limit:** `lim(x→0) sin(x)/x = 1`"
        ),
        'suggestions': ['Derivatives', 'Continuity', 'Epsilon-delta definition']
    },

    # ── Web Development ────────────────────────────────────────────────────────
    r'html|hypertext markup|html5|semantic html': {
        'response': (
            "## 🌐 HTML5\n\n"
            "**Semantic elements** improve accessibility and SEO:\n\n"
            "```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>My Page</title>\n</head>\n<body>\n  <header>...</header>\n  <nav>...</nav>\n  <main>\n    <article>...</article>\n    <aside>...</aside>\n  </main>\n  <footer>...</footer>\n</body>\n</html>\n```"
        ),
        'suggestions': ['CSS Flexbox', 'CSS Grid', 'JavaScript DOM']
    },
    r'css|cascading style|flexbox|css grid|responsive': {
        'response': (
            "## 🎨 CSS\n\n"
            "```css\n/* Flexbox */\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 1rem;\n}\n\n/* Grid */\n.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n\n/* Custom properties */\n:root { --primary: #6699ff; }\n.btn { color: var(--primary); }\n```"
        ),
        'suggestions': ['CSS animations', 'CSS variables', 'Responsive design']
    },
    r'javascript|js basics|dom manipulation|es6': {
        'response': (
            "## ⚡ JavaScript\n\n"
            "```javascript\n// Modern JS (ES6+)\nconst greet = (name) => `Hello, ${name}!`;\n\n// Destructuring\nconst { x, y } = point;\nconst [first, ...rest] = array;\n\n// Async/Await\nasync function fetchData(url) {\n  const res = await fetch(url);\n  return res.json();\n}\n\n// Optional chaining\nconst city = user?.address?.city ?? 'Unknown';\n```"
        ),
        'suggestions': ['JavaScript promises', 'JavaScript classes', 'JavaScript modules']
    },
    r'react|react.js|react hooks|usestate|useeffect': {
        'response': (
            "## ⚛️ React\n\n"
            "```jsx\nimport { useState, useEffect } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  useEffect(() => {\n    document.title = `Count: ${count}`;\n  }, [count]);\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(c => c + 1)}>\n        Increment\n      </button>\n    </div>\n  );\n}\n```\n\n"
            "**Key hooks:** `useState`, `useEffect`, `useContext`, `useReducer`, `useMemo`, `useCallback`"
        ),
        'suggestions': ['React context', 'React Router', 'React performance']
    },
    r'vue|vue.js|vuex|composition api': {
        'response': (
            "## 💚 Vue.js\n\n"
            "```vue\n<template>\n  <div>\n    <p>{{ message }}</p>\n    <button @click=\"greet\">Click me</button>\n  </div>\n</template>\n\n<script setup>\nimport { ref } from 'vue';\nconst message = ref('Hello Vue!');\nconst greet = () => { message.value = 'Hello World!'; };\n</script>\n```\n\n"
            "Vue 3 uses the **Composition API** with `<script setup>` for cleaner, more reusable logic."
        ),
        'suggestions': ['Vue Router', 'Pinia state management', 'Vue directives']
    },
    r'typescript|ts|type annotation|interface typescript': {
        'response': (
            "## 🔷 TypeScript\n\n"
            "```typescript\n// Types & Interfaces\ninterface User {\n  id: number;\n  name: string;\n  email?: string; // optional\n}\n\n// Generics\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n\n// Union & Intersection types\ntype StringOrNumber = string | number;\ntype AdminUser = User & { role: 'admin' };\n\n// Type guards\nfunction isString(val: unknown): val is string {\n  return typeof val === 'string';\n}\n```"
        ),
        'suggestions': ['TypeScript generics', 'TypeScript decorators', 'TypeScript utility types']
    },

    # ── Backend & DevOps ───────────────────────────────────────────────────────
    r'node.js|nodejs|express|npm': {
        'response': (
            "## 🟢 Node.js\n\n"
            "```javascript\nconst express = require('express');\nconst app = express();\n\napp.use(express.json());\n\napp.get('/api/users', async (req, res) => {\n  try {\n    const users = await User.findAll();\n    res.json({ success: true, users });\n  } catch (err) {\n    res.status(500).json({ error: err.message });\n  }\n});\n\napp.listen(3000, () => console.log('Server running on port 3000'));\n```"
        ),
        'suggestions': ['REST API design', 'Express middleware', 'Node.js async patterns']
    },
    r'docker|container|dockerfile|docker-compose': {
        'response': (
            "## 🐳 Docker\n\n"
            "```dockerfile\n# Dockerfile\nFROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nEXPOSE 5000\nCMD [\"python\", \"app.py\"]\n```\n\n"
            "```yaml\n# docker-compose.yml\nservices:\n  web:\n    build: .\n    ports:\n      - \"5000:5000\"\n  db:\n    image: postgres:15\n    environment:\n      POSTGRES_PASSWORD: secret\n```\n\n"
            "**Key commands:** `docker build`, `docker run`, `docker ps`, `docker-compose up`"
        ),
        'suggestions': ['Docker volumes', 'Docker networking', 'Kubernetes basics']
    },
    r'git|version control|git branch|git merge|git rebase': {
        'response': (
            "## 🌿 Git\n\n"
            "```bash\n# Essential workflow\ngit init\ngit add .\ngit commit -m \"feat: add new feature\"\ngit push origin main\n\n# Branching\ngit checkout -b feature/my-feature\ngit merge feature/my-feature\ngit rebase main\n\n# Undo\ngit reset --soft HEAD~1  # undo commit, keep changes\ngit revert <hash>        # safe undo for shared branches\n```\n\n"
            "**Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`"
        ),
        'suggestions': ['Git workflows', 'Git stash', 'GitHub Actions']
    },

    # ── Databases ──────────────────────────────────────────────────────────────
    r'sql|structured query|select|join|database query': {
        'response': (
            "## 🗄️ SQL\n\n"
            "```sql\n-- Basic SELECT\nSELECT name, email FROM users WHERE active = 1;\n\n-- JOINs\nSELECT u.name, o.total\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nWHERE o.total > 100;\n\n-- Aggregation\nSELECT department, AVG(salary) as avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 50000\nORDER BY avg_salary DESC;\n```"
        ),
        'suggestions': ['SQL indexes', 'SQL transactions', 'SQL window functions']
    },
    r'mongodb|nosql|document database|mongoose': {
        'response': (
            "## 🍃 MongoDB\n\n"
            "```javascript\n// Mongoose schema\nconst userSchema = new Schema({\n  name: { type: String, required: true },\n  email: { type: String, unique: true },\n  createdAt: { type: Date, default: Date.now }\n});\n\n// CRUD operations\nawait User.create({ name: 'Alice', email: 'alice@example.com' });\nawait User.find({ name: /alice/i });\nawait User.findByIdAndUpdate(id, { $set: { name: 'Bob' } });\nawait User.deleteOne({ _id: id });\n```"
        ),
        'suggestions': ['MongoDB aggregation', 'MongoDB indexes', 'Redis caching']
    },
    r'graphql|apollo|query mutation|graphql schema': {
        'response': (
            "## 🔮 GraphQL\n\n"
            "```graphql\n# Schema definition\ntype User {\n  id: ID!\n  name: String!\n  posts: [Post!]!\n}\n\n# Query\nquery GetUser($id: ID!) {\n  user(id: $id) {\n    name\n    posts { title }\n  }\n}\n\n# Mutation\nmutation CreatePost($input: PostInput!) {\n  createPost(input: $input) {\n    id\n    title\n  }\n}\n```\n\n"
            "GraphQL lets clients **request exactly the data they need** — no over/under-fetching!"
        ),
        'suggestions': ['REST vs GraphQL', 'Apollo Client', 'GraphQL subscriptions']
    },
    r'rest api|restful|http methods|api design': {
        'response': (
            "## 🌐 REST API Design\n\n"
            "**HTTP Methods:**\n"
            "- `GET /users` — list all users\n"
            "- `POST /users` — create user\n"
            "- `GET /users/:id` — get one user\n"
            "- `PUT /users/:id` — replace user\n"
            "- `PATCH /users/:id` — partial update\n"
            "- `DELETE /users/:id` — delete user\n\n"
            "**Status codes:** 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server Error\n\n"
            "**Best practices:** Use nouns not verbs, version your API (`/v1/`), return consistent JSON"
        ),
        'suggestions': ['API authentication', 'Rate limiting', 'GraphQL vs REST']
    },

    # ── Algorithms & Data Structures ───────────────────────────────────────────
    r'big o|time complexity|space complexity|algorithm complexity': {
        'response': (
            "## ⏱️ Big O Notation\n\n"
            "| Complexity | Name | Example |\n"
            "|---|---|---|\n"
            "| O(1) | Constant | Array access |\n"
            "| O(log n) | Logarithmic | Binary search |\n"
            "| O(n) | Linear | Linear search |\n"
            "| O(n log n) | Linearithmic | Merge sort |\n"
            "| O(n²) | Quadratic | Bubble sort |\n"
            "| O(2ⁿ) | Exponential | Fibonacci (naive) |\n\n"
            "**Rule of thumb:** Always aim for O(n log n) or better for sorting/searching."
        ),
        'suggestions': ['Binary search', 'Sorting algorithms', 'Dynamic programming']
    },
    r'binary search|search algorithm|sorted array': {
        'response': (
            "## 🔍 Binary Search — O(log n)\n\n"
            "```python\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\n# Example\narr = [1, 3, 5, 7, 9, 11]\nprint(binary_search(arr, 7))  # 3\n```"
        ),
        'suggestions': ['Binary search tree', 'Linear search', 'Hash tables']
    },
    r'sorting|sort algorithm|quicksort|mergesort|heapsort': {
        'response': (
            "## 🔀 Sorting Algorithms\n\n"
            "| Algorithm | Best | Average | Worst | Space |\n"
            "|---|---|---|---|---|\n"
            "| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) |\n"
            "| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) |\n"
            "| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) |\n"
            "| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) |\n\n"
            "**Use Merge Sort** when stability matters. **Use Quick Sort** for in-place sorting with good average performance."
        ),
        'suggestions': ['Dynamic programming', 'Graph algorithms', 'Hash tables']
    },
    r'dynamic programming|dp|memoization|tabulation': {
        'response': (
            "## 🧠 Dynamic Programming\n\n"
            "DP solves problems by breaking them into **overlapping subproblems**.\n\n"
            "```python\n# Fibonacci with memoization\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n\n# Fibonacci with tabulation\ndef fib_tab(n):\n    dp = [0, 1]\n    for i in range(2, n+1):\n        dp.append(dp[i-1] + dp[i-2])\n    return dp[n]\n```\n\n"
            "**Classic DP problems:** Knapsack, Longest Common Subsequence, Coin Change, Edit Distance"
        ),
        'suggestions': ['Greedy algorithms', 'Backtracking', 'Graph algorithms']
    },

    # ── Math & Statistics ──────────────────────────────────────────────────────
    r'statistics|mean|median|mode|standard deviation': {
        'response': (
            "## 📊 Statistics Basics\n\n"
            "```python\nimport statistics\n\ndata = [2, 4, 4, 4, 5, 5, 7, 9]\n\nprint(statistics.mean(data))    # 5.0\nprint(statistics.median(data))  # 4.5\nprint(statistics.mode(data))    # 4\nprint(statistics.stdev(data))   # 2.0\nprint(statistics.variance(data))# 4.0\n```\n\n"
            "**Normal distribution:** 68% within 1σ, 95% within 2σ, 99.7% within 3σ"
        ),
        'suggestions': ['Probability', 'Hypothesis testing', 'Regression analysis']
    },
    r'probability|bayes|conditional probability': {
        'response': (
            "## 🎲 Probability\n\n"
            "**Bayes' Theorem:** `P(A|B) = P(B|A) × P(A) / P(B)`\n\n"
            "**Key rules:**\n"
            "- Addition: `P(A∪B) = P(A) + P(B) - P(A∩B)`\n"
            "- Multiplication: `P(A∩B) = P(A) × P(B|A)`\n"
            "- Complement: `P(A') = 1 - P(A)`\n\n"
            "**Distributions:** Binomial, Normal (Gaussian), Poisson, Uniform"
        ),
        'suggestions': ['Statistics', 'Machine learning', 'Hypothesis testing']
    },
    r'linear algebra|matrix|vector|eigenvalue': {
        'response': (
            "## 🔢 Linear Algebra\n\n"
            "```python\nimport numpy as np\n\n# Vectors\nv1 = np.array([1, 2, 3])\nv2 = np.array([4, 5, 6])\ndot = np.dot(v1, v2)  # 32\n\n# Matrices\nA = np.array([[1,2],[3,4]])\nB = np.array([[5,6],[7,8]])\nC = A @ B  # Matrix multiplication\n\n# Eigenvalues\nvals, vecs = np.linalg.eig(A)\n```\n\n"
            "**Key concepts:** Dot product, Cross product, Matrix multiplication, Determinant, Eigenvalues/Eigenvectors"
        ),
        'suggestions': ['NumPy', 'Machine learning math', 'Principal Component Analysis']
    },

    # ── Machine Learning ───────────────────────────────────────────────────────
    r'machine learning|ml overview|artificial intelligence|ai': {
        'response': (
            "## 🤖 Machine Learning\n\n"
            "**Types of ML:**\n"
            "- **Supervised:** Labeled data → predict output (regression, classification)\n"
            "- **Unsupervised:** Find patterns in unlabeled data (clustering, dimensionality reduction)\n"
            "- **Reinforcement:** Agent learns from rewards/penalties\n\n"
            "**ML Pipeline:**\n"
            "1. Data collection & cleaning\n"
            "2. Feature engineering\n"
            "3. Model selection & training\n"
            "4. Evaluation (accuracy, F1, AUC)\n"
            "5. Deployment & monitoring"
        ),
        'suggestions': ['Neural networks', 'scikit-learn', 'Feature engineering']
    },
    r'neural network|deep learning|perceptron|backpropagation': {
        'response': (
            "## 🧠 Neural Networks\n\n"
            "```python\nimport torch\nimport torch.nn as nn\n\nclass SimpleNet(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.layers = nn.Sequential(\n            nn.Linear(784, 256),\n            nn.ReLU(),\n            nn.Dropout(0.2),\n            nn.Linear(256, 10)\n        )\n\n    def forward(self, x):\n        return self.layers(x)\n```\n\n"
            "**Activation functions:** ReLU, Sigmoid, Tanh, Softmax, GELU\n"
            "**Training:** Forward pass → Loss → Backprop → Gradient descent"
        ),
        'suggestions': ['CNN', 'RNN/LSTM', 'Transformers/Attention']
    },

    # ── Physics & Chemistry ────────────────────────────────────────────────────
    r'physics|newton|kinematics|force|energy': {
        'response': (
            "## ⚛️ Physics Basics\n\n"
            "**Newton's Laws:**\n"
            "1. An object at rest stays at rest (inertia)\n"
            "2. F = ma (force = mass × acceleration)\n"
            "3. Every action has an equal and opposite reaction\n\n"
            "**Kinematics equations:**\n"
            "- `v = u + at`\n"
            "- `s = ut + ½at²`\n"
            "- `v² = u² + 2as`\n\n"
            "**Energy:** KE = ½mv², PE = mgh, Work = F·d·cos(θ)"
        ),
        'suggestions': ['Thermodynamics', 'Electromagnetism', 'Quantum mechanics basics']
    },
    r'chemistry|periodic table|atom|molecule|reaction': {
        'response': (
            "## ⚗️ Chemistry Basics\n\n"
            "**Atomic structure:** Protons + Neutrons (nucleus) + Electrons (orbitals)\n\n"
            "**Chemical bonding:**\n"
            "- **Ionic:** Metal + Non-metal (electron transfer)\n"
            "- **Covalent:** Non-metal + Non-metal (electron sharing)\n"
            "- **Metallic:** Metal lattice with free electrons\n\n"
            "**Balancing equations:** `2H₂ + O₂ → 2H₂O`\n\n"
            "**Mole concept:** 1 mole = 6.022 × 10²³ particles (Avogadro's number)"
        ),
        'suggestions': ['Organic chemistry', 'Thermochemistry', 'Electrochemistry']
    },

    # ── General ────────────────────────────────────────────────────────────────
    r'hello|hi|hey|good morning|good afternoon|good evening': {
        'response': (
            "## 👋 Hello!\n\n"
            "I'm your **NeuralLearn AI Tutor**! I can help you with:\n\n"
            "🐍 **Python** — syntax, OOP, libraries\n"
            "📐 **Calculus** — derivatives, integrals, limits\n"
            "🌐 **Web Dev** — HTML, CSS, JS, React, Vue\n"
            "🤖 **Machine Learning** — algorithms, neural networks\n"
            "🐳 **Docker & Git** — DevOps essentials\n"
            "🗄️ **Databases** — SQL, MongoDB, GraphQL\n"
            "📊 **Math** — statistics, linear algebra, probability\n"
            "⚛️ **Science** — physics, chemistry basics\n\n"
            "What would you like to learn today? 🚀"
        ),
        'suggestions': ['Python basics', 'Web development', 'Machine learning']
    },
    r'thank|thanks|thank you|appreciate': {
        'response': (
            "You're welcome! 😊 Keep up the great work!\n\n"
            "Remember: **consistent practice** is the key to mastery. "
            "Every expert was once a beginner. 💪\n\n"
            "Is there anything else you'd like to explore?"
        ),
        'suggestions': ['Take a quiz', 'Browse courses', 'View analytics']
    },
    r'help|what can you do|capabilities|topics': {
        'response': (
            "## 🎓 What I Can Help With\n\n"
            "**Programming:** Python, JavaScript, TypeScript, React, Vue, Node.js\n"
            "**DevOps:** Docker, Git, CI/CD\n"
            "**Databases:** SQL, MongoDB, GraphQL, REST APIs\n"
            "**Math:** Calculus, Statistics, Linear Algebra, Probability\n"
            "**ML/AI:** Machine Learning, Neural Networks, Data Science\n"
            "**Science:** Physics, Chemistry basics\n"
            "**CS Theory:** Algorithms, Data Structures, Big O\n\n"
            "Just ask your question and I'll explain it clearly with examples! 💡"
        ),
        'suggestions': ['Python tutorial', 'SQL basics', 'Machine learning intro']
    },
}


# ── Difficulty detection ───────────────────────────────────────────────────────
CONFUSION_SIGNALS = [
    r"don't understand|confused|i don't get|help me understand|unclear|i'm lost|not sure what|can you explain more"
]

def detect_confusion(message: str) -> bool:
    msg = message.lower()
    return any(re.search(p, msg) for p in CONFUSION_SIGNALS)

def simplify_response(response: str) -> str:
    """Add a simplified intro when user seems confused."""
    return (
        "💡 **Let me explain this simply:**\n\n" + response +
        "\n\n---\n*Need more clarification? Try asking a more specific question!*"
    )

# ── Suggest next topics ────────────────────────────────────────────────────────
def suggest_next(matched_key: str, kb_entry: dict) -> list:
    """Return topic suggestions from the KB entry or generate defaults."""
    return kb_entry.get('suggestions', ['Python basics', 'Web development', 'Machine learning'])

# ── Confidence scoring ────────────────────────────────────────────────────────
def score_confidence(pattern: str, message: str) -> float:
    """Score how well the pattern matches the message (0.0 - 1.0)."""
    msg = message.lower()
    parts = pattern.split('|')
    matches = sum(1 for p in parts if re.search(p.strip(), msg))
    return round(min(matches / max(len(parts), 1), 1.0), 2)

# ── Core response function ────────────────────────────────────────────────────
def get_response(message: str, history: list = None) -> dict:
    msg = message.lower().strip()
    confused = detect_confusion(msg)

    # Check context from history for follow-up questions
    context_hint = ''
    if history:
        recent = history[-3:]
        for h in reversed(recent):
            if h.get('role') == 'ai' and len(h.get('content', '')) > 50:
                context_hint = h['content'][:100]
                break

    best_match = None
    best_score = 0.0
    best_key = ''

    for pattern, entry in KB.items():
        if re.search(pattern, msg):
            score = score_confidence(pattern, msg)
            if score > best_score:
                best_score = score
                best_match = entry
                best_key = pattern

    if best_match:
        response_text = best_match['response']
        if confused:
            response_text = simplify_response(response_text)
        suggestions = suggest_next(best_key, best_match)
        return {
            'response': response_text,
            'suggestions': suggestions,
            'confidence': best_score,
            'matched': True
        }

    # Fallback
    fallback = (
        "🤔 That's an interesting question! I don't have a specific answer for that yet.\n\n"
        "Try asking about: **Python**, **JavaScript**, **React**, **Docker**, **Git**, "
        "**SQL**, **MongoDB**, **Machine Learning**, **Calculus**, **Statistics**, or **Algorithms**.\n\n"
        "Or rephrase with more specific keywords!"
    )
    return {
        'response': fallback,
        'suggestions': ['Python basics', 'Web development', 'Machine learning intro'],
        'confidence': 0.0,
        'matched': False
    }

# ── In-memory chat history store ──────────────────────────────────────────────
_histories: dict = {}

# ── Routes ────────────────────────────────────────────────────────────────────
@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Invalid JSON'}), 400
        message = data.get('message', '').strip()
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400

        # Get session history
        session_id = request.headers.get('X-Session-ID', 'default')
        history = data.get('history', _histories.get(session_id, []))

        result = get_response(message, history)

        # Update history
        history.append({'role': 'user', 'content': message})
        history.append({'role': 'ai', 'content': result['response']})
        _histories[session_id] = history[-20:]  # keep last 20 messages

        return jsonify({
            'success': True,
            'response': result['response'],
            'suggestions': result['suggestions'],
            'confidence': result['confidence']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@chatbot_bp.route('/chat/history', methods=['GET'])
def chat_history():
    """Get chat history for the current session."""
    session_id = request.headers.get('X-Session-ID', 'default')
    history = _histories.get(session_id, [])
    return jsonify({'success': True, 'history': history, 'count': len(history)})


@chatbot_bp.route('/suggest', methods=['GET'])
def suggest():
    """Get topic suggestions based on a query."""
    query = request.args.get('q', '').strip().lower()
    if not query:
        topics = ['Python basics', 'JavaScript ES6', 'React hooks', 'SQL joins',
                  'Docker containers', 'Git branching', 'Machine learning', 'Calculus derivatives']
        return jsonify({'success': True, 'suggestions': topics})

    matches = []
    for pattern, entry in KB.items():
        if re.search(query, pattern):
            matches.extend(entry.get('suggestions', []))
    if not matches:
        matches = ['Python basics', 'Web development', 'Machine learning']

    return jsonify({'success': True, 'suggestions': list(set(matches))[:8]})
