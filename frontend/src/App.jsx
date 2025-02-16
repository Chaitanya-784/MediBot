import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TransformedItems } from './dropdown';
import { io } from 'socket.io-client';
import backgroundImage from './assets/bgimge.jpg';
import send_svg from './assets/send.svg';

const socket = io('http://127.0.0.1:5000');

function App() {
  const [text, setText] = useState('');
  const [initialData, setInitialData] = useState(true);
  const [chatMessage, setChatMessage] = useState([
    {
      message: "Hey there! I'm your Care Companion. Please provide your full name, email, and mobile number to get started.",
      self: false,
    },
  ]);
  const [menuOpen, setMenuOpen] = useState(false); // Sidebar state
  const [chatHistory, setChatHistory] = useState([]); // Chat history
  const chatContainerRef = useRef(null);

  const dropdownItems = useMemo(() => TransformedItems(), []);

  // Load chat history from Local Storage on app load
  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    setChatHistory(storedHistory);
  }, []);

  // Save chat history to Local Storage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const socketEmit = () => {
    let temp = {
      message: text,
      self: true,
    };
    setChatMessage((prev) => [...prev, temp]);
    if (initialData) {
      if (text.includes('@')) {
        socket.emit('initial_message', {
          message: text,
        });
        setInitialData(false);
        let thank = {
          message: 'Thank You! Please proceed',
          self: false,
        };
        setChatMessage((prev) => [...prev, thank]);
      } else {
        let error = {
          message: 'Invalid input, make sure to include an "@" in the email',
          self: false,
        };
        setChatMessage((prev) => [...prev, error]);
      }
    } else {
      socket.emit('message', {
        message: text,
      });
    }

    setText('');
  };

  useEffect(() => {
    socket.on('recv_message', (data) => {
      let temp = {
        message: data,
        self: false,
      };
      setChatMessage((prev) => [...prev, temp]);
    });

    return () => {
      socket.off('recv_message');
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessage]);

  // Handle New Chat
  const handleNewChat = () => {
    // Save current chat to history if it has messages
    if (chatMessage.length > 1) {
      setChatHistory((prev) => [...prev, chatMessage]);
    }

    // Reset current chat
    setChatMessage([
      {
        message: "Hey there! I'm your Care Companion. Please provide your full name, email, and mobile number to get started.",
        self: false,
      },
    ]);
    setInitialData(true);
    setMenuOpen(false);
  };

  // Load a chat from history
  const loadChatFromHistory = (chat) => {
    setChatMessage(chat);
    setMenuOpen(false);
  };

  return (
    <div className="App flex flex-col w-full h-screen items-center text-white"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backdropFilter: 'blur(20px)',
        margin: 0,
        padding: 0
      }}
    >
      <header className="flex items-center justify-between w-full h-16 p-4 bg-brown-500 text-black shadow-md">
        <div className="flex items-center">
          {/* Three-line menu button */}
          <button
            className="focus:outline-none mr-4"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <div className="flex flex-col space-y-1">
              <span className="block w-6 h-1 bg-black"></span>
              <span className="block w-6 h-1 bg-black"></span>
              <span className="block w-6 h-1 bg-black"></span>
            </div>
          </button>

          {/* MediBot Title */}
          <h1 className="text-3xl font-bold">MediBot</h1>
        </div>

        <nav>
          <ul className="flex space-x-4">
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
            <li>
              <button
                className="w-10 h-10 bg-green-600 text-white flex justify-center items-center rounded-full font-bold focus:outline-none"
                onClick={() => alert('Profile button clicked!')}
              >
                P
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {/* Sidebar */}
      {menuOpen && (
        <aside className="fixed top-0 left-0 w-64 h-full bg-gray-800 text-white shadow-lg p-4 z-50">
          <button
            className="text-lg font-bold mb-4 focus:outline-none text-white"
            onClick={() => setMenuOpen(false)}
          >
            Close
          </button>
          <button
            className="w-full py-2 px-4 bg-green-600 rounded-md font-bold text-white hover:bg-green-700 mb-4"
            onClick={handleNewChat}
          >
            New Chat
          </button>
          {/* Chat History */}
          <h2 className="text-lg font-bold mb-2">Chat History</h2>
          <ul className="space-y-2">
            {chatHistory.map((chat, index) => (
              <li key={index}>
                <button
                  className="w-full text-left py-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600"
                  onClick={() => loadChatFromHistory(chat)}
                >
                  Chat {index + 1}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <main className="flex flex-col w-full flex-grow overflow-auto p-4 space-y-4">
        {/* Chat screen */}
        <section id="chatscreen" ref={chatContainerRef} className="flex flex-col w-full h-full overflow-auto">
          {chatMessage.map((item, key) => (
            <div
              key={key}
              className={`max-w-3/4 py-2 px-4 font-poppins text-lg rounded-3xl ${item.self ? 'bg-gray-300 text-black ml-auto' : 'bg-gray-300 text-black mr-auto'} my-3`}
            >
              {item.message}
            </div>
          ))}
        </section>
      </main>

      <footer className="flex relative w-full h-16 justify-center items-end p-4 bg-brown-500 text-white shadow-md">
        <input
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              socketEmit();
            }
          }}
          placeholder='Enter message'
          className='rounded-full w-3/4 bg-gray-800 py-2 px-4 border-2 border-gray-700 text-white focus:outline-none'
          onChange={(e) => setText(e.target.value)}
          type='text'
          value={text}
        />
        <button
          className='text-xl bg-green-500 py-2 px-4 flex justify-center items-center rounded-full font-bebas ml-2 text-white focus:outline-none'
          onClick={socketEmit}
        >
          <img className='w-6' src={send_svg} alt="Send Icon" />
        </button>
      </footer>
    </div>
  );
}

export default App;
