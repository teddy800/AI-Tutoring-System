from flask import Flask
from flask_cors import CORS
from api.courses import courses_bp
from api.quizzes import quizzes_bp
from api.chatbot import chatbot_bp
from api.analytics import analytics_bp
from api.repository import repository_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost"}})

app.register_blueprint(courses_bp, url_prefix='/api')
app.register_blueprint(quizzes_bp, url_prefix='/api')
app.register_blueprint(chatbot_bp, url_prefix='/api')
app.register_blueprint(analytics_bp, url_prefix='/api')
app.register_blueprint(repository_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)