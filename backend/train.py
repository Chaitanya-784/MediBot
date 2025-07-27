import nltk
nltk.download('punkt')
nltk.download('wordnet')
from nltk.stem import WordNetLemmatizer
lemma = WordNetLemmatizer()
import json
import pickle

import numpy as np
from keras.models import Sequential
from keras.layers import Dense, Dropout
from keras.optimizers import SGD
import random

# Load intents
with open('intents.json', encoding='utf-8') as file:
    intents = json.load(file)

words = []
classes = []
docs = []
ignore_words = ['?', '!', '', "'"]

for i in intents['intents']:
    for pattern in i['patterns']:
        w = nltk.word_tokenize(pattern)
        words.extend(w)
        docs.append((w, i['tag']))
        if i['tag'] not in classes:
            classes.append(i['tag'])

words = [lemma.lemmatize(w.lower()) for w in words if w not in ignore_words]
words = sorted(list(set(words)))
classes = sorted(list(set(classes)))

print(len(docs), "documents")
print(len(classes), "classes", classes)
print(len(words), "unique lemmatized words", words)

pickle.dump(words, open('word.pkl', 'wb'))
pickle.dump(classes, open('class.pkl', 'wb'))

# Training set preparation
training = []
output_empty = [0] * len(classes)

for d in docs:
    bag = []
    pattern_words = d[0]
    pattern_words = [lemma.lemmatize(word.lower()) for word in pattern_words]
    for w in words:
        bag.append(1) if w in pattern_words else bag.append(0)
    output_row = list(output_empty)
    output_row[classes.index(d[1])] = 1
    training.append([bag, output_row])

random.shuffle(training)
training = np.array(training, dtype=object)
x_train = list(training[:, 0])
y_train = list(training[:, 1])
print("Created Training data successfully")

# Build and train the model
model = Sequential()
model.add(Dense(150, input_shape=(len(x_train[0]),), activation='relu'))
model.add(Dropout(0.1))
model.add(Dense(150, activation='relu'))
model.add(Dropout(0.1))
model.add(Dense(len(y_train[0]), activation='softmax'))

sgd = SGD(learning_rate=0.01, decay=1e-6, momentum=0.9, nesterov=True)
model.compile(loss='categorical_crossentropy', optimizer=sgd, metrics=['accuracy'])

model.fit(np.array(x_train), np.array(y_train), epochs=250, batch_size=5, verbose=1)
model.save('model.h5')

print("Successful model creation")
loss, accuracy = model.evaluate(np.array(x_train), np.array(y_train))
print('Accuracy:', accuracy)
print('Loss:', loss)

#############################
# VALIDATION WITH REAL QUERIES
#############################

def clean_up_sentence(sentence):
    sentence_words = nltk.word_tokenize(sentence)
    return [lemma.lemmatize(word.lower()) for word in sentence_words]

def bow(sentence, words):
    sentence_words = clean_up_sentence(sentence)
    bag = np.zeros(len(words), dtype=np.float32)
    for s in sentence_words:
        for i, w in enumerate(words):
            if w == s:
                bag[i] = 1
    return bag

def predict_class(sentence, model, threshold=0.90):
    p = bow(sentence, words)
    res = model.predict(np.array([p]))[0]
    results = [(i, r) for i, r in enumerate(res) if r > threshold]
    results.sort(key=lambda x: x[1], reverse=True)
    if results:
        return classes[results[0][0]], float(results[0][1])
    else:
        return None, None  # Imitate Gemini fallback case

# Sample validation queries (expand with real test data as needed)
# Validation test set using your intents.json

test_queries = [
    # --- KNOWN INTENT/PATTERN QUERIES (chosen from .json to test accuracy) ---
    # GREETING
    "Hello!",
    "hiii",
    "Hi there, can you help me with something?",
    "Good morning/afternoon/evening! Can you answer a question for me?",
    
    # GREETING1
    "How's your day going",
    "kaise ho",

    # GOODBYE
    "Thank you",
    "bye",
    "I got to go",
    "It was nice talking to you!",

    # NAME
    "Who are you?",
    "what is your name?",

    # CREATOR
    "who created you",
    "your developers",

    # COMMON HEALTH SYMPTOMS/AILMENTS
    "What are some remedies for a fever?",
    "I am sneezing and have a mild fever, what should I do?",
    "I have a cold, what should I do?",
    "How can I cure a headache and body pain?",
    "I have a dry cough, what can I do?",
    "I have a skin rash, what can I do?",
    "I feel very tired all the time, what should I do?",
    "I have body pain, what can I do?",
    "Why do my muscles feel sore?",
    "I have pimples on my face, what should I do?",
    "I am losing a lot of hair, what should I do?",
    "I have dandruff, what should I do?",
    "I have pain in my eyes, what should I do?",
    "I have ear pain, what can I do?",
    "I have pain in my wrist, what should I do?",
    "I have sore muscles, what can I do?",
    "How can I treat minor infections at home?",
    "What is your gender?",

    # FOOD POISONING/HYGIENE
    "What causes food poisoning?",
    "What infections are caused by poor hygiene?",
    "Home remedies for acid reflux",
    "Natural remedies for migraine",

    # RANDOM, HUMOR, ETC
    "Will you marry me",
    "fuck you",
    "You are very clever",
    "Do you know other chatbots?",
    "Who is the best digital assistant?",
    "Thank you for your assistance.",
    "ok",
    "okk"

    # --- UNKNOWN or OUT-OF-SCOPE (should trigger Gemini fallback) ---
    ,"Book me a cab to the airport."
    ,"Can you play my favorite music?"
    ,"What is the stock price of Tesla today?"
    ,"Who is the current Prime Minister of Canada?"
    ,"What's the capital of Mongolia?"
    ,"Write me a poem about the moon."
    ,"Give me the weather forecast for Paris tomorrow."
    ,"Translate 'hello' to Japanese."
    ,"What is the meaning of life?"
    ,"Tell me a story about dragons."
    ,"How do I fix my car's flat tire?"
    ,"Can you help me code a Python program for sorting numbers?"
    ,"What's the best way to invest in cryptocurrency?"
    ,"Remind me to call mom at 6pm."
    ,"What's the WiFi password?"
    ,"Create a graphic design for my business logo."
    ,"Order a pizza for me."
    ,"Book a hotel in New York."
    ,"Check my email."
    ,"Send a message to John."
]


print("\nVALIDATION RESULTS (intent coverage & fallback simulation):")
for q in test_queries:
    intent, prob = predict_class(q, model)
    if intent:
        print(f"User: {q!r}\n   → Matched intent: {intent} (confidence={prob:.2f})")
    else:
        print(f"User: {q!r}\n   → No confident intent match — Gemini fallback would trigger")

