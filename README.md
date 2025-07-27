# **MediBot: Your Intelligent Health Companion**

 

**MediBot** is a full-stack, AI-powered health assistant designed to provide intelligent, context-aware responses to user health queries. It integrates a sophisticated **multimodal Large Language Model (Google Gemini)** to analyze not just text, but also user-uploaded images (like skin conditions) and PDF documents (like lab reports).

This application features secure user authentication, persistent, account-based chat history, and a real-time, intuitive interface, making it a robust and scalable solution for preliminary health assistance.

**[Live Demo Link](https://your-medibot-url.vercel.app)** 

## 🚀 Key Features

*   🔐 **Secure User Authentication & Sessions**: Full signup and login flow with username/email validation and password hashing. User sessions and chat history are securely tied to individual accounts.

*   🧠 **Advanced AI Reasoning with Google Gemini**: Leverages the power of Google's `gemini-1.5-flash` model for sophisticated, human-like understanding and response generation, moving far beyond simple keyword matching.

*   👁️ **Multimodal Analysis (Image & PDF)**: Users can upload images of visible symptoms (e.g., rashes, moles, ulcers) or PDF documents (e.g., lab reports) for direct analysis by the AI, providing a richer, more informed interaction.

*   🗣️ **Context-Aware Follow-Up Questions**: For ambiguous health complaints, MediBot can initiate a multi-turn Q&A session to gather necessary context before providing a comprehensive summary, mimicking a preliminary consultation.

*   💾 **Persistent Chat History**: All conversations are automatically saved to a MongoDB database. Users can view, manage, rename, and delete their past chat sessions from a dedicated history panel.

*   ⚡ **Real-time, Responsive Interface**: Built with React and communicating via WebSockets (Socket.IO), the UI delivers instantaneous, real-time messaging for a smooth user experience.

*   🏛️ **Scalable Full-Stack Architecture**: Designed with a modern microservices-inspired approach, separating the frontend (React), the core API (Node.js/Express), and the AI processing service (Python/Flask) for scalability and maintainability.

## 🛠️ Tech Stack & Architecture

This project is composed of three main services that work together.

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, Tailwind CSS, Socket.io-client | Handles the user interface, state management, and real-time communication. |
| **Backend API** | Node.js, Express, MongoDB, Mongoose | Manages user authentication, session data, and persisting chat messages. |
| **AI Service** | Python, Flask, Socket.IO, Google Gemini API, TensorFlow/Keras | Handles real-time chat, processes AI requests, and performs local intent classification. |

### System Architecture Diagram

https://github.com/Chaitanya-784/MediBot/blob/main/image.png
```

## ⚙️ Getting Started: Local Setup

To run this project locally, you need to set up and run all three services concurrently.

### Prerequisites
*   Node.js v18 or later
*   Python 3.9 or later
*   MongoDB installed locally or a free MongoDB Atlas account

### 1. Backend API (Node.js & Express)
This service handles user data and chat history.

```bash
# Navigate to the Node.js backend directory
cd dbbackend

# Install dependencies
npm install

# Create a .env file and add the required environment variables (see below)

# Run the server
node Server.js
# Your Node.js API will be running on http://localhost:5001
```

### 2. AI Service (Python & Flask)
This service handles the core AI chat logic.

```bash
# Navigate to the Python backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Mac/Linux
# venv\Scripts\activate    # On Windows

# Install Python dependencies
pip install -r requirements.txt

# Create a .env file and add your Google API Key (see below)

# (Optional) Train the initial local intent model
python train.py

# Run the Flask-SocketIO server
python chat.py
# Your Python AI server will be running on http://localhost:5000
```

### 3. Frontend (React)
This is the user interface.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Create a .env.local file and add the required environment variables (see below)

# Run the React development server
npm start
# Your application will be accessible at http://localhost:3000
```

## 🔑 Environment Variables

You must create `.env` files in each service's root directory.

#### 👉 `dbbackend/.env`
```env
MONGO_URI="your_mongodb_connection_string"
PORT=5001
JWT_SECRET="your_strong_jwt_secret_key"
```

#### 👉 `backend/.env`
```env
GOOGLE_API_KEY="your_google_ai_studio_api_key"
```

#### 👉 `frontend/.env.local`
```env
REACT_APP_API_URL="http://localhost:5001/api"
REACT_APP_SOCKET_URL="http://localhost:5000"
```

## 📄 Usage Flow

1.  **Sign Up / Log In**: New users can create an account. The system validates inputs and requires OTP verification. Existing users can log in.
2.  **Start a Chat**: Once logged in, the main chat interface is displayed. Past conversations are listed in the sidebar.
3.  **Text-Based Queries**: Ask a health-related question. If it's a simple query, the bot may answer directly. If it's complex, the bot will ask clarifying questions.
4.  **Image Upload**: Click the attachment icon to upload an image of a visible symptom. Add a text query describing the issue. The bot will analyze both and provide a synthesized response.
5.  **PDF Upload**: Upload a PDF document like a medical report for the AI to read and discuss with you.
6.  **Manage History**: Click on any past conversation in the sidebar to load it. Use the options menu to rename or delete chats.

## 🚀 Deployment

This application is designed for a modern cloud deployment workflow:

*   **Frontend (React)**: Deployed on **Vercel** for continuous integration and global CDN.
*   **Backend API (Node.js)**: Deployed as a Web Service on **Render**.
*   **AI Service (Python)**: Deployed as a separate Web Service on **Render**.
*   **Database**: Hosted on **MongoDB Atlas** using their free shared cluster.

This architecture ensures scalability, low cost, and easy maintenance.

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features or improvements, feel free to fork the repository, make your changes, and open a pull request.

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.