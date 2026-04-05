from flask import Blueprint, request, jsonify
import re

chatbot_bp = Blueprint('chatbot', __name__)

# ── Knowledge base ────────────────────────────────────────────────────────────
KB = {
    # Python
    r'what is python|python language': (
        "**Python** is a high-level, interpreted programming language known for its clean syntax and readability. "
        "It supports multiple paradigms: procedural, object-oriented, and functional. "
        "Key uses: web development (Django/Flask), data science (Pandas/NumPy), ML (TensorFlow/PyTorch), automation, and scripting."
    ),
    r'python variable|variable in python': (
        "In Python, variables are dynamically typed — no declaration needed:\n"
        "`x = 10` (int), `name = 'Alice'` (str), `pi = 3.14` (float), `active = True` (bool)\n"
        "Python infers the type automatically. Use `type(x)` to check."
    ),
    r'python function|def keyword|define function': (
        "Functions in Python are defined with `def`:\n"
        "`def greet(name): return f'Hello, {name}!'`\n"
        "Support default args, *args, **kwargs, and lambda expressions. "
        "Functions are first-class objects — they can be passed as arguments."
    ),
    r'python class|oop python|object oriented python': (
        "Python OOP uses `class` keyword:\n"
        "`class Animal: def __init__(self, name): self.name = name`\n"
        "Supports inheritance, encapsulation, polymorphism. "
        "Use `super()` for parent class access. Dunder methods like `__str__`, `__repr__` customize behavior."
    ),
    r'python list|list comprehension': (
        "Lists are ordered, mutable sequences: `nums = [1, 2, 3]`\n"
        "List comprehension: `squares = [x**2 for x in range(10)]`\n"
        "Key methods: `.append()`, `.extend()`, `.pop()`, `.sort()`, `.reverse()`"
    ),
    r'python dict|dictionary python': (
        "Dictionaries store key-value pairs: `person = {'name': 'Alice', 'age': 25}`\n"
        "Access: `person['name']` or `person.get('name')`\n"
        "Dict comprehension: `{k: v for k, v in items}`\n"
        "Methods: `.keys()`, `.values()`, `.items()`, `.update()`"
    ),
    r'python loop|for loop|while loop': (
        "**For loop**: `for i in range(10): print(i)`\n"
        "**While loop**: `while condition: do_something()`\n"
        "Use `break` to exit, `continue` to skip, `else` clause runs when loop completes normally."
    ),
    r'python error|exception|try except': (
        "Exception handling in Python:\n"
        "`try: risky_code() except ValueError as e: handle(e) finally: cleanup()`\n"
        "Common exceptions: `ValueError`, `TypeError`, `KeyError`, `IndexError`, `FileNotFoundError`\n"
        "Raise custom: `raise CustomError('message')`"
    ),
    r'python file|read file|write file': (
        "File I/O in Python:\n"
        "`with open('file.txt', 'r') as f: content = f.read()`\n"
        "Modes: `'r'` read, `'w'` write, `'a'` append, `'rb'` binary read\n"
        "Always use `with` statement — it auto-closes the file."
    ),
    r'pip|install package|python package': (
        "Install packages with pip: `pip install package_name`\n"
        "Use virtual environments: `python -m venv venv` then `source venv/bin/activate`\n"
        "List installed: `pip list` | Freeze: `pip freeze > requirements.txt`"
    ),

    # Calculus
    r'derivative|differentiation|diff of': (
        "**Derivatives** measure the rate of change of a function.\n"
        "Key rules: Power rule: `d/dx(xⁿ) = nxⁿ⁻¹`\n"
        "Chain rule: `d/dx[f(g(x))] = f'(g(x)) · g'(x)`\n"
        "Product rule: `(uv)' = u'v + uv'`\n"
        "Common: `d/dx(sin x) = cos x`, `d/dx(eˣ) = eˣ`, `d/dx(ln x) = 1/x`"
    ),
    r'integral|integration|antiderivative': (
        "**Integration** is the reverse of differentiation — finds area under a curve.\n"
        "Power rule: `∫xⁿ dx = xⁿ⁺¹/(n+1) + C`\n"
        "Common: `∫sin x dx = -cos x + C`, `∫eˣ dx = eˣ + C`\n"
        "Definite integral: `∫[a,b] f(x) dx = F(b) - F(a)` (Fundamental Theorem of Calculus)"
    ),
    r'limit|limits calculus': (
        "**Limits** describe function behavior as x approaches a value.\n"
        "`lim(x→a) f(x) = L` means f(x) gets arbitrarily close to L.\n"
        "L'Hôpital's rule: for 0/0 or ∞/∞ forms, `lim f/g = lim f'/g'`\n"
        "Squeeze theorem: if g(x) ≤ f(x) ≤ h(x) and lim g = lim h = L, then lim f = L"
    ),

    # Web Development
    r'html|hypertext markup': (
        "**HTML** (HyperText Markup Language) structures web content.\n"
        "Semantic elements: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`\n"
        "Forms: `<input>`, `<select>`, `<textarea>`, `<button>`\n"
        "Always include `<!DOCTYPE html>`, `lang` attribute, and proper meta tags."
    ),
    r'css|cascading style|flexbox|grid layout': (
        "**CSS** styles HTML elements.\n"
        "Flexbox: `display: flex; justify-content: center; align-items: center;`\n"
        "Grid: `display: grid; grid-template-columns: repeat(3, 1fr);`\n"
        "Custom properties: `--color: #6699ff; color: var(--color);`\n"
        "Responsive: `@media (max-width: 768px) { ... }`"
    ),
    r'javascript|js|dom manipulation': (
        "**JavaScript** adds interactivity to web pages.\n"
        "DOM: `document.getElementById('id')`, `querySelector('.class')`\n"
        "Events: `element.addEventListener('click', handler)`\n"
        "Async: `async function fetchData() { const res = await fetch(url); }`\n"
        "ES6+: arrow functions, destructuring, spread operator, template literals"
    ),
    r'react|vue|angular|frontend framework': (
        "Modern frontend frameworks:\n"
        "**React**: Component-based, virtual DOM, JSX syntax, hooks (useState, useEffect)\n"
        "**Vue**: Progressive framework, reactive data binding, single-file components\n"
        "**Angular**: Full framework by Google, TypeScript-first, dependency injection\n"
        "Choose React for flexibility, Vue for simplicity, Angular for enterprise."
    ),
    r'api|rest api|fetch|http request': (
        "**REST APIs** use HTTP methods:\n"
        "`GET` — retrieve data | `POST` — create | `PUT/PATCH` — update | `DELETE` — remove\n"
        "Fetch in JS: `const res = await fetch('/api/data', { method: 'POST', body: JSON.stringify(data) })`\n"
        "Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error"
    ),

    # Machine Learning
    r'machine learning|ml|artificial intelligence': (
        "**Machine Learning** enables computers to learn from data.\n"
        "Types: Supervised (labeled data), Unsupervised (clustering), Reinforcement (rewards)\n"
        "Pipeline: Data collection → Preprocessing → Feature engineering → Model training → Evaluation → Deployment\n"
        "Popular libraries: scikit-learn, TensorFlow, PyTorch, Keras"
    ),
    r'neural network|deep learning|perceptron': (
        "**Neural Networks** are inspired by the brain — layers of interconnected nodes.\n"
        "Architecture: Input layer → Hidden layers → Output layer\n"
        "Activation functions: ReLU, Sigmoid, Tanh, Softmax\n"
        "Training: Forward pass → Loss calculation → Backpropagation → Weight update (gradient descent)"
    ),
    r'linear regression|regression model': (
        "**Linear Regression** models the relationship between variables.\n"
        "Formula: `y = mx + b` (simple) or `y = w₁x₁ + w₂x₂ + ... + b` (multiple)\n"
        "Cost function: Mean Squared Error (MSE)\n"
        "Optimization: Gradient descent minimizes the cost function iteratively."
    ),
    r'classification|logistic regression|decision tree': (
        "**Classification** predicts discrete categories.\n"
        "Logistic Regression: uses sigmoid function, outputs probability\n"
        "Decision Trees: split data based on feature thresholds\n"
        "Random Forest: ensemble of decision trees, reduces overfitting\n"
        "Evaluation: Accuracy, Precision, Recall, F1-Score, ROC-AUC"
    ),

    # Algorithms & Data Structures
    r'big o|time complexity|space complexity': (
        "**Big O Notation** describes algorithm efficiency:\n"
        "O(1) — Constant | O(log n) — Logarithmic | O(n) — Linear\n"
        "O(n log n) — Linearithmic | O(n²) — Quadratic | O(2ⁿ) — Exponential\n"
        "Binary search: O(log n) | Merge sort: O(n log n) | Bubble sort: O(n²)"
    ),
    r'binary search|search algorithm': (
        "**Binary Search** finds an element in a sorted array in O(log n):\n"
        "1. Set low=0, high=len-1\n"
        "2. mid = (low+high)//2\n"
        "3. If arr[mid]==target: found! If target>arr[mid]: low=mid+1, else high=mid-1\n"
        "4. Repeat until found or low>high"
    ),
    r'sorting|sort algorithm|quicksort|mergesort': (
        "Common sorting algorithms:\n"
        "**Merge Sort**: O(n log n), stable, divide-and-conquer\n"
        "**Quick Sort**: O(n log n) avg, O(n²) worst, in-place\n"
        "**Heap Sort**: O(n log n), in-place, not stable\n"
        "**Bubble/Insertion Sort**: O(n²), good for small/nearly-sorted data"
    ),

    # General
    r'hello|hi|hey|good morning|good afternoon': (
        "Hello! 👋 I'm your NeuralLearn AI tutor. I can help you with:\n"
        "🐍 **Python** — variables, functions, OOP, file I/O\n"
        "📐 **Calculus** — derivatives, integrals, limits\n"
        "🌐 **Web Dev** — HTML, CSS, JavaScript, APIs\n"
        "🤖 **Machine Learning** — algorithms, neural networks\n"
        "📊 **Data Structures** — Big O, sorting, searching\n"
        "What would you like to learn today?"
    ),
    r'thank|thanks|thank you': (
        "You're welcome! 😊 Keep up the great work. "
        "Remember: consistent practice is the key to mastery. "
        "Is there anything else you'd like to explore?"
    ),
    r'help|what can you do|what do you know': (
        "I can help you with:\n"
        "• **Python** programming (syntax, OOP, libraries)\n"
        "• **Calculus** (derivatives, integrals, limits)\n"
        "• **Web Development** (HTML, CSS, JS, React)\n"
        "• **Machine Learning** (algorithms, neural networks)\n"
        "• **Data Structures & Algorithms** (Big O, sorting)\n"
        "• **Databases** (SQL, NoSQL)\n"
        "Just ask your question and I'll explain it clearly!"
    ),
    r'quiz|test|exam|practice': (
        "Great idea! Head to the **Quizzes** section to test your knowledge. 📝\n"
        "You'll earn points and badges for good scores!\n"
        "Tip: Review the course material first, then take the quiz for best results."
    ),
    r'course|enroll|learn': (
        "Check out the **Courses** section for our full curriculum! 📚\n"
        "We offer: Python, Calculus, Web Development, Machine Learning, Cybersecurity, and Data Science.\n"
        "Click any course card to see the syllabus and enroll."
    ),
}

def get_response(message: str) -> str:
    msg = message.lower().strip()
    for pattern, response in KB.items():
        if re.search(pattern, msg):
            return response
    # Fallback with helpful suggestions
    return (
        "That's an interesting question! I'm not sure I have a specific answer for that. 🤔\n"
        "Try asking about: **Python**, **Calculus**, **Web Development**, **Machine learning**, "
        "**algorithms**, or **data structures**.\n"
        "Or rephrase your question with more specific keywords!"
    )

@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Invalid JSON'}), 400
        message = data.get('message', '').strip()
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        response = get_response(message)
        return jsonify({'success': True, 'response': response})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
