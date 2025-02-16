import nltk
import json
import pickle
import numpy as np
import requests
from bs4 import BeautifulSoup
import random
from nltk.stem import WordNetLemmatizer
from keras.models import load_model
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit

# Initialize lemmatizer
lemma = WordNetLemmatizer()

# Load trained model & data
model = load_model('model.h5')
intents = json.loads(open('intents.json').read())
words = pickle.load(open('word.pkl', 'rb'))
classes = pickle.load(open('class.pkl', 'rb'))

# Function to clean & preprocess input
def clean_up_sentence(sentence):
    sentence_words = nltk.word_tokenize(sentence)
    sentence_words = [lemma.lemmatize(word.lower()) for word in sentence_words]
    return sentence_words

# Convert sentence to Bag of Words
def bow(sentence, words, show_details=False):
    sentence_words = clean_up_sentence(sentence)
    cltn = np.zeros(len(words), dtype=np.float32)
    for word in sentence_words:
        for i, w in enumerate(words):
            if w == word:
                cltn[i] = 1
    return cltn

# Predict class using trained model
def predict_class(sentence, model):
    l = bow(sentence, words, show_details=False)
    res = model.predict(np.array([l]))[0]
    
    ERROR_THRESHOLD = 0.25
    results = [(i, j) for i, j in enumerate(res) if j > ERROR_THRESHOLD]
    results.sort(key=lambda x: x[1], reverse=True)
    return_list = [{"intent": classes[k[0]], "probability": str(k[1])} for k in results]
    return return_list  

# Get response from predefined intents
def getResponse(ints, intents_json):
    if ints:
        tag = ints[0]['intent']
        for i in intents_json['intents']:
            if i['tag'] == tag:
                return random.choice(i['responses'])
    return None

# ✅ Web Scraping: Fetch medical info from Healthline
def scrape_healthline(query):
    search_url = f"https://www.healthline.com/search?q={query.replace(' ', '+')}"
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(search_url, headers=headers)

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, "html.parser")
        results = soup.find_all("a", class_="css-7edcas")
        if results:
            article_link = "https://www.healthline.com" + results[0]['href']
            return f"Here’s what I found on Healthline: {article_link}"
    
    return "I couldn't find reliable medical information."

# Main chatbot function
def chatbotResponse(msg):
    ints = predict_class(msg, model)
    response = getResponse(ints, intents)
    
    if response:  # If intent is found, return response
        return response
    
    # If no intent is found, try Healthline Scraping
    return scrape_healthline(msg)

# ✅ Flask API for Web & Mobile Integration
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Flask Route for Web API
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    response = chatbotResponse(user_message)
    return jsonify({"response": response})

# Flask Socket.io for WebSocket Communication
@socketio.on('message')
def handle_message(data):
    response = chatbotResponse(data['message'])
    emit('recv_message', response)

if __name__ == "__main__":
    socketio.run(app, debug=True)
