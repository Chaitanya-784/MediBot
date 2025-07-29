import nltk
nltk.download('punkt', quiet=True)
nltk.download('wordnet', quiet=True)
from nltk.stem import WordNetLemmatizer

import json
import pickle
import numpy as np
from keras.models import load_model
import random
import os
import os

import google.generativeai as genai
from flask import Flask
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

# --- Upgraded Imports ---
import base64
import magic
import io
from PIL import Image
import torch
import timm
from torchvision import transforms
import fitz  # PyMuPDF


project_root = os.path.dirname(os.path.dirname(__file__))
print("prjct path:", project_root)
dotenv_path = os.path.join(project_root, 'dbbackend', '.env')
load_dotenv(dotenv_path=dotenv_path)
print("ENV path:", dotenv_path)

# Now get your key!
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

genai.configure(api_key=GOOGLE_API_KEY)
gemini_model = genai.GenerativeModel(model_name='models/gemini-1.5-flash')


model = load_model('model.h5')
with open('intents.json', encoding='utf-8') as file:
    intents = json.load(file)
words = pickle.load(open('word.pkl', 'rb'))
classes = pickle.load(open('class.pkl', 'rb'))

lemma = WordNetLemmatizer()
user_sessions = {}

# --- Load a Pre-trained Image Model using timm ---

# --- Helper Functions (Upgraded and Original) ---

def extract_text_from_pdf(pdf_data):
    try:
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
        return text if text else "No text could be extracted from the PDF."
    except Exception as e:
        return f"Error reading PDF file: {e}"

def clean_up_sentence(sentence):
    sentence_words = nltk.word_tokenize(sentence)
    return [lemma.lemmatize(word.lower()) for word in sentence_words]

def bow(sentence, words):
    sentence_words = clean_up_sentence(sentence)
    bag = np.zeros(len(words), dtype=np.float32)
    for word in sentence_words:
        for i, w in enumerate(words):
            if w == word: bag[i] = 1
    return bag

def predict_class(sentence, model, words, classes, threshold=0.9):
    if not sentence.strip(): return None, None
    bow_vec = bow(sentence, words)
    res = model.predict(np.array([bow_vec]), verbose=0)[0]
    results = [(i, r) for i, r in enumerate(res) if r > threshold]
    results.sort(key=lambda x: x[1], reverse=True)
    return (classes[results[0][0]], float(results[0][1])) if results else (None, None)

def ask_google_gemini(prompt_parts):
    try:
        response = gemini_model.generate_content(prompt_parts)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "Sorry, I'm having trouble connecting to my knowledge base. Please try again."

# RE-INTEGRATED: This is your original function to enable the multi-turn Q&A.
def extract_questions(response):
    questions = []
    for line in response.split('\n'):
        line = line.strip(' -*\t')
        if not line: continue
        if (line.endswith('?') or line[:2].isdigit()) and len(line) < 200:
            questions.append(line)
        elif any(line.lower().startswith(prefix) for prefix in ('when', 'how', 'is', 'does', 'do', 'have', 'are', 'was', 'what', 'can', 'where', 'please', 'will')) and line.endswith('?'):
            questions.append(line)
    return questions

# --- Flask & SocketIO Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Main Message Handler with Merged Logic ---
@socketio.on('message')
def handle_message(data):
    user_message = data.get('message', '').strip()
    file_info = data.get('file')
    sid = data.get('sid', '')

    if not user_message and not file_info:
        emit('recv_message', "Please type a message or upload a file.")
        return

    

    # --- 1. Intent classifier gate (Original Logic) ---
    intent, prob = predict_class(user_message, model, words, classes)
    if intent:
        for i in intents['intents']:
            if i['tag'] == intent:
                emit('recv_message', random.choice(i['responses']))
                return

    # --- 2. Multi-turn Gemini fallback logic (Original Logic) ---
    session = user_sessions.get(sid, {})
    stage = session.get('stage', 'init')

    if stage == 'questioning':
        session['answers'].append(user_message)
        session['current_q'] += 1
        if session['current_q'] < len(session['questions']):
            next_q = session['questions'][session['current_q']]
            user_sessions[sid] = session
            emit('recv_message', next_q)
            return 
        else:
            context = f"User initial message: {session['init_msg']}\n"
            for q, a in zip(session['questions'], session['answers']):
                context += f"Q: {q}\nA: {a}\n"
            context += "\nGiven all this, summarize: possible cause, remedies, and what to do next. Always include a disclaimer to consult a doctor."
            response = ask_google_gemini(context)
            del user_sessions[sid]
            emit('recv_message', response)
            return 
        return

    # --- 3. New session: Process files and ask Gemini (Enhanced Logic) ---
    
    if file_info:
        try:
            header, encoded = file_info['data'].split(",", 1)
            file_data = base64.b64decode(encoded)
            mime_type = magic.from_buffer(file_data, mime=True)
            prompt_parts = []
            if 'image' in mime_type:
                image_for_prompt = Image.open(io.BytesIO(file_data))
                prompt_text = (
                    "You are a helpful medical assistant. The user has uploaded an image and a text query. "
                    "Analyze the image and the query to provide a synthesized response. "
                    "Based on the visual information, describe what you see, suggest possible causes, and recommend next steps. "
                    "Always include a strong disclaimer that you are an AI, this is not a diagnosis, and the user must consult a qualified healthcare professional.\n\n"
                    f"User's Text Query: \"{user_message}\""
                )
                prompt_parts = [prompt_text, image_for_prompt]

            elif 'pdf' in mime_type:
                pdf_text = f"\n[Extracted from PDF]:\n{extract_text_from_pdf(file_data)[:2000]}..."
                prompt_text = (
                     "You are a helpful medical assistant. Analyze the user's message in conjunction with the following text extracted from their uploaded PDF. "
                     "Provide a comprehensive, synthesized response. If appropriate, suggest next steps and always include a disclaimer to consult a healthcare professional.\n\n"
                     f"User's Text Query: \"{user_message}\"\n"
                     f"{pdf_text}\n\n"
                     "Your synthesized response:"
                )
                prompt_parts = [prompt_text]

            # If there are parts to send, call Gemini
            if prompt_parts:
                gemini_response = ask_google_gemini(prompt_parts)
                emit('recv_message', gemini_response)
                return

        except Exception as e:
            emit('recv_message', "There was an error processing your file. Please try again.")
            print(f"[ERROR] File processing failed: {e}")
            return
    
    # Construct the final prompt based on whether a file was provided
    prompt = (
        f"User message: \"{user_message}\"\n"
        "Instruction: If this is a factual or informational question, answer directly. "
        "If this is a health complaint needing context, list 2-5 precise clarification questions as a bulleted list. "
        "Do not provide advice until you have all clarifications. Only list the questions if you are asking for clarification.\n"
        "Your response:"
    )
    gemini_response = ask_google_gemini([prompt]) # Pass as a list
    questions = extract_questions(gemini_response)

    if questions : # Only start Q&A for text-only queries
        session = {
            'stage': 'questioning', 'questions': questions,
            'answers': [], 'current_q': 0, 'init_msg': user_message
        }
        user_sessions[sid] = session
        emit('recv_message', questions[0])
        return 
    else:
        if sid in user_sessions: del user_sessions[sid]
        emit('recv_message', gemini_response)
        return 

if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)