from flask import Blueprint, request, jsonify
import nltk
from nltk.chat.util import Chat, reflections

chatbot_bp = Blueprint('chatbot', __name__)

nltk.download('punkt', quiet=True)

pairs = [
    [r"hi|hello|hey",
     ["Hello! How can I assist you today?",
      "Hi there! What would you like to learn?"]],
    [r"what is (.*)",
     [lambda matches: f"Great question! '{matches[0]}' is a topic I can help with. Could you be more specific?"]],
    [r"how do i (.*)",
     [lambda matches: f"To {matches[0]}, you should start by breaking the problem into smaller steps. Want me to guide you?"]],
    [r"help(.*)",
     ["I'm here to help! Ask me anything about your courses, quizzes, or learning materials."]],
    [r"quit|bye|exit",
     ["Goodbye! Keep learning!"]],
    [r"(.*)",
     ["That's an interesting question! Could you rephrase it so I can help better?",
      "I'm not sure I understand. Try asking about a specific topic or course."]],
]

chatbot = Chat(pairs, reflections)

@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Invalid JSON'}), 400
        message = data.get('message', '').strip()
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        response = chatbot.respond(message)
        return jsonify({
            'success': True,
            'response': response or "I'm not sure how to answer that. Try asking about a course or topic!"
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
