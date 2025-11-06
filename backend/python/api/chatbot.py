from flask import Blueprint, request, jsonify
import nltk
from nltk.chat.util import Chat, reflections

chatbot_bp = Blueprint('chatbot', __name__)

nltk.download('punkt', quiet=True)
pairs = [
    [r"hi|hello", ["Hello! How can I assist you today?"]],
    [r"what is (.*)", ["I'm not sure about {}, but I can help with general questions!".format]],
    [r"quit", ["Goodbye!"]]
]
chatbot = Chat(pairs, reflections)

@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        response = chatbot.respond(message)
        return jsonify({'success': True, 'response': response or 'Sorry, I didn’t understand that.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500