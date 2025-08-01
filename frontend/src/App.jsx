// Updated App.jsx with deep debugging and systematic logging everywhere
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import backgroundImage from './assets/bgimge.jpg';
import send_svg from './assets/send.svg';
import { HiDotsVertical } from 'react-icons/hi';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const socket = io(SOCKET_URL);


function App() {
  // State initialization with logs
  const [text, setText] = useState('');
  const [initialData, setInitialData] = useState(true);
  const [chatMessage, setChatMessage] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userId, setUserId] = useState(() => sessionStorage.getItem('userId'));
  const [regStep, setRegStep] = useState(-1);
  const [loginStep, setLoginStep] = useState(0);
  const [loginInitiated, setLoginInitiated] = useState(false);
  const [signupInitiated, setSignupInitiated] = useState(false);
  const [userDetails, setUserDetails] = useState({ name: '', email: '', phone: '', password: '' });
  const [chatHistory, setChatHistory] = useState([]);
  const chatContainerRef = useRef(null);
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('sessionId'));
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [pendingRename, setPendingRename] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  




  // ConfirmDialog component
  const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmText = "Confirm" }) => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-md shadow-md text-black w-80">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md">{confirmText}</button>
        </div>
      </div>
    </div>
  );

  // Logging state on mount
  useEffect(() => {
    console.log('App mounted. userId:', userId, 'sessionId:', sessionId, 'chatHistory:', chatHistory, 'chatMessage:', chatMessage);
  }, []);

  // --- Fetching messages for a selected session ---
  const fetchMessagesForSession = async (selectedSessionId) => {
    console.log('[fetchMessagesForSession]', { selectedSessionId });
    if (!selectedSessionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${selectedSessionId}`);
      console.log('[fetchMessagesForSession] Fetch status:', res.status, res.statusText);
      if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
      const messages = await res.json();
      console.log('[fetchMessagesForSession] messages:', messages);
      const formattedMessages = messages.map(msg => ({
        message: msg.message,
        self: msg.sender === 'user'
      }));
      setChatMessage(formattedMessages);
      setSessionId(selectedSessionId);
      sessionStorage.setItem('sessionId', selectedSessionId);
    } catch (error) {
      console.error("[fetchMessagesForSession] Error:", error);
      setChatMessage([{ message: "Could not load messages for this chat.", self: false }]);
    }
  };

  // --- Load user chat history (full) ---
  const loadUserHistory = async (currentUserId) => {
    console.log('[loadUserHistory] For user:', currentUserId);
    try {
      const sessionsRes = await fetch(`${API_BASE_URL}/api/chat/sessions/user/${currentUserId}`);
      console.log('[loadUserHistory] sessions fetch status:', sessionsRes.status, sessionsRes.statusText);
      if (!sessionsRes.ok) {
        throw new Error(`Failed to fetch sessions: ${sessionsRes.statusText}`);
      }
      const sessions = await sessionsRes.json();
      console.log('[loadUserHistory] sessions:', sessions);
      if (!sessions || sessions.length === 0) {
        setChatMessage([{ message: "Welcome! Start your first conversation.", self: false }]);
        setChatHistory([]);
        sessionStorage.removeItem('sessionId');
        return;
      }
      const mostRecentSession = sessions[sessions.length - 1];
      const recentSessionId = mostRecentSession._id;
      console.log('[loadUserHistory] Fetching messages from session', recentSessionId);
      const messagesRes = await fetch(`${API_BASE_URL}/api/chat/messages/${recentSessionId}`);
      if (!messagesRes.ok) {
        throw new Error(`Failed to fetch messages: ${messagesRes.statusText}`);
      }
      const messages = await messagesRes.json();
      const formattedMessages = messages.map(msg => ({
        message: msg.message,
        self: msg.sender === 'user'
      }));
      setChatHistory(sessions);
      setChatMessage(formattedMessages);
      setSessionId(recentSessionId);
      sessionStorage.setItem('sessionId', recentSessionId);
      console.log('[loadUserHistory] History loaded: chatHistory:', sessions, 'chatMessage:', formattedMessages);
    } catch (error) {
      console.error("[loadUserHistory] Error loading user history:", error);
      setChatMessage([{ message: "Could not load your chat history. Please try again later.", self: false }]);
    }
  };

  useEffect(() => {
    const currentUserId = sessionStorage.getItem('userId');
    console.log('[useEffect: initial mount] userId:', currentUserId);
    if (currentUserId) {
      loadUserHistory(currentUserId);
    } else {
      setChatMessage([
        { message: "👋 Welcome to MediBot! Are you a new user or existing one?", self: false },
        { message: "Type `signup` to create an account or `login` to sign in.", self: false }
      ]);
    }
  }, []);

  // Fetch chat history for active session
  const fetchChatHistory = async (id) => {
    const sessionId = sessionStorage.getItem('sessionId');
    console.log('[fetchChatHistory]', { sessionId, id });
    if (!sessionId) {
      console.log("[fetchChatHistory] No session ID found, can't fetch history.");
      setChatMessage([{ message: "Welcome! I am your care companion.", self: false }]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${sessionId}`);
      const data = await res.json();
      console.log('[fetchChatHistory] Fetched:', data);
      if (data && data.length > 0) {
        const formatted = data.map(dbMessage => ({
          message: dbMessage.message,
          self: dbMessage.sender === 'user'
        }));
        setChatMessage([
          { message: "Welcome back! Here's your conversation history.", self: false },
          ...formatted
        ]);
      } else {
        setChatMessage([{ message: "Welcome! Start a new conversation.", self: false }]);
      }
    } catch (error) {
      console.error("[fetchChatHistory] Failed to fetch chat history:", error);
      setChatMessage([{ message: "Could not load chat history.", self: false }]);
    }
  };

  // Confirm deletion
  const confirmDelete = async () => {
    console.log('[confirmDelete] Pending:', pendingDelete);
    const { sessionId, index } = pendingDelete;
    await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}`, { method: 'DELETE' });
    const updated = [...chatHistory];
    updated.splice(index, 1);
    setChatHistory(updated);
    setChatMessage([{ message: "Chat deleted.", self: false }]);
    setShowConfirm(false);
    console.log('[confirmDelete] Success. chatHistory now:', updated);
  };

  const renameChat = async (sessionId, newTitle, index) => {
    console.log('[renameChat] sessionId:', sessionId, 'title:', newTitle, 'index:', index);
    await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    const updated = [...chatHistory];
    updated[index].title = newTitle;
    setChatHistory(updated);
    console.log('[renameChat] Chat renamed:', updated[index]);
  };

  // File selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      console.log('[handleFileChange] File selected:', e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    console.log('[removeSelectedFile] Removing file:', selectedFile);
    setSelectedFile(null);
  };

  const logout = () => {
    console.log('[logout] Logging out. Clearing sessionStorage.');
    sessionStorage.clear();
    localStorage.removeItem('chatMessage');
    window.location.reload();
  };

  // *** MAIN SOCKET/CHAT FUNCTION with logging ***
  const socketEmit = async () => {
    const msg = text.trim();
    console.log('[socketEmit] Called. msg:', msg, 'selectedFile:', selectedFile);

    if (!msg && !selectedFile) {
      console.log('[socketEmit] No message or file. Returning early.');
      return;
    }

    setText('');
    if (msg) {
      setChatMessage(prev => [...prev, { message: msg, self: true }]);
    }

    // ---------- 1. Handle Pre-Login Auth ----------
    if (!userId && initialData) {
      console.log('[socketEmit] Pre-login state. signup:', signupInitiated, 'regStep:', regStep, 'login:', loginInitiated, 'loginStep:', loginStep);
      if (msg.toLowerCase() === 'signup') {
        setSignupInitiated(true);
        setRegStep(0);
        setChatMessage(prev => [...prev, { message: "Create a unique username:", self: false }]);
        return;
      }
      if (msg.toLowerCase() === 'login') {
        setLoginInitiated(true);
        setLoginStep(0);
        setChatMessage(prev => [...prev, { message: "Enter your username:", self: false }]);
        return;
      }

      // Handle signup workflow
      if (signupInitiated && regStep >= 0) {
        switch (regStep) {
          case 0:
            try {
              console.log('[Signup Step 0] Checking username:', msg);
              const res = await fetch(`${API_BASE_URL}/api/auth/check-username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: msg }),
              });
              const data = await res.json();
              console.log('[Signup Step 0] Username check result:', data);
              if (data.available) {
                setUserDetails(prev => ({ ...prev, name: msg }));
                setChatMessage(prev => [...prev, { message: 'Enter your email:', self: false }]);
                setRegStep(1);
              } else {
                setChatMessage(prev => [...prev, { message: '❌ Username taken. Please try another one.', self: false }]);
              }
            } catch (err) {
              console.error('[Signup Step 0] Error:', err);
              setChatMessage(prev => [...prev, { message: '⚠️ Error checking username. Try again.', self: false }]);
            }
            break;
          case 1:
            const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
            const domain = msg.split('@')[1];
            if (!allowedDomains.includes(domain)) {
              setChatMessage(prev => [...prev, { message: '❌ Only common email domains allowed. Try a valid email (e.g., Gmail,Outlook,Yahoo).', self: false }]);
              break;
            }
            try {
              console.log('[Signup Step 1] Checking email:', msg);
              const res = await fetch(`${API_BASE_URL}/api/auth/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: msg }),
              });
              const data = await res.json();
              console.log('[Signup Step 1] Email check result:', data);
              if (data.available) {
                setUserDetails(prev => ({ ...prev, email: msg }));
                setChatMessage(prev => [...prev, { message: 'Enter your phone number:', self: false }]);
                setRegStep(2);
              } else {
                setChatMessage(prev => [...prev, { message: '❌ Email already in use. Try another one.', self: false }]);
              }
            } catch (err) {
              console.error('[Signup Step 1] Error:', err);
              setChatMessage(prev => [...prev, { message: '⚠️ Error checking email. Try again.', self: false }]);
            }
            break;
          case 2:
            if (!/^\d{10}$/.test(msg)) {
              setChatMessage(prev => [...prev, { message: '❌ Invalid phone number. Please enter a 10-digit number.', self: false }]);
              return;
            }
            setUserDetails(prev => ({ ...prev, phone: msg }));
            setChatMessage(prev => [...prev, { message: 'Create a password:', self: false }]);
            setRegStep(3);
            break;
          case 3:
            const fullDetails = { ...userDetails, password: msg };
            setUserDetails(fullDetails);
            setChatMessage(prev => [...prev, { message: 'Sending OTP to your email...', self: false }]);
            console.log('[Signup Step 3] Register:', fullDetails);
            await fetch('${API_BASE_URL}/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fullDetails),
            });
            setChatMessage(prev => [...prev, { message: 'Enter OTP to verify:', self: false }]);
            setRegStep(4);
            break;
          case 4:
            const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userDetails.email, otp: msg }),
            });
            const verifyData = await verifyRes.json();
            console.log('[Signup Step 4] OTP Verify data:', verifyData);
            if (verifyData.userId) {
              sessionStorage.setItem('userId', verifyData.userId);
              sessionStorage.setItem('userEmail', userDetails.email);
              setUserId(verifyData.userId);
              setInitialData(false);
              await loadUserHistory(verifyData.userId);
              // Potential missing sessionRes fix - remove if unnecessary
              // const sessionData = await sessionRes.json();
              // sessionStorage.setItem('sessionId', sessionData._id);
              // setSessionId(sessionData._id);
              fetchChatHistory(verifyData.userId);
              setChatMessage(prev => [...prev, { message: '✅ Verified successfully! You can start chatting now.', self: false }]);
            } else {
              setChatMessage(prev => [...prev, { message: '❌ Invalid OTP. Please try again.', self: false }]);
            }
            break;
          default:
            break;
        }
        return;
      }

      // Handle login workflow
      if (loginInitiated) {
        if (loginStep === 0) {
          console.log('[Login Step 0] Checking username:', msg);
          const res = await fetch(`${API_BASE_URL}/api/auth/username-exists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: msg })
          });
          const data = await res.json();
          console.log('[Login Step 0] Username exists check:', data, 'input:', msg);
          if (data.exists) {
            setUserDetails(prev => ({ ...prev, name: msg }));
            setChatMessage(prev => [...prev, { message: 'Enter your password:', self: false }]);
            setLoginStep(1);
          } else {
            setChatMessage(prev => [...prev, { message: '❌ Invalid username.', self: false }]);
          }
        } else if (loginStep === 1) {
          console.log('[Login Step 1] Logging in for user:', userDetails.name);
          const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: userDetails.name, password: msg })
          });
          const data = await res.json();
          console.log('[Login Step 1] Login result:', data);
          if (data.userId) {
            sessionStorage.setItem('userId', data.userId);
            sessionStorage.setItem('userEmail', data.email);
            setUserId(data.userId);
            setInitialData(false);
            await loadUserHistory(data.userId);
            // Potential missing sessionRes fix - remove if unnecessary
            // const sessionData = await sessionRes.json();
            // sessionStorage.setItem('sessionId', sessionData._id);
            // setSessionId(sessionData._id);
            fetchChatHistory(data.userId);
            setChatMessage(prev => [...prev, { message: '🔐 Login successful! Start chatting.', self: false }]);
          } else {
            setChatMessage(prev => [...prev, { message: '❌ Invalid credentials.', self: false }]);
          }
        }
        return;
      }

      setChatMessage(prev => [
        ...prev,
        { message: "❗ Please type `signup` to create an account or `login` to sign in.", self: false }
      ]);
      return;
    }

    // ---------- 2. Handle Normal Chat Flow (Logged In) ----------
    const sendMessageAndSave = async (payload) => {
      let currentSessionId = sessionStorage.getItem('sessionId');
      console.log('[sendMessageAndSave] sessionId:', currentSessionId, 'payload:', payload);
      if (!currentSessionId) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/chat/startSession`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, title: payload.message ? payload.message.slice(0, 30) : "New Chat" })
          });
          const data = await res.json();
          currentSessionId = data._id;
          sessionStorage.setItem('sessionId', currentSessionId);
          setSessionId(currentSessionId);
          setChatHistory(prev => [...prev, data]);
          console.log('[sendMessageAndSave] Started new session:', data);
        } catch (err) {
          console.error("[sendMessageAndSave] Failed to start session:", err);
          return;
        }
      }
      payload.sid = currentSessionId;
      console.log('[sendMessageAndSave] Emitting via socket:', payload);
      socket.emit('message', payload);

      // Save user message to backend
      if (payload.message) {
        try {
          const saveRes = await fetch(`${API_BASE_URL}/api/chat/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, sessionId: currentSessionId, message: payload.message, sender: 'user' })
          });
          const saveData = await saveRes.json();
          console.log('[sendMessageAndSave] Saved user message:', saveData);
        } catch (error) {
          console.error('[sendMessageAndSave] Error saving message:', error);
        }
      }
    };

    if (selectedFile) {
      setChatMessage(prev => [...prev, { message: `Attached: ${selectedFile.name}`, self: true }]);
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target.result;
        console.log('[socketEmit] File Data Read:', { fileData });
        const payload = {
          message: msg,
          file: { name: selectedFile.name, type: selectedFile.type, data: fileData },
        };
        sendMessageAndSave(payload);
        setSelectedFile(null);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      const payload = { message: msg };
      sendMessageAndSave(payload);
    }
  };

  // SOCKET receive handler
  useEffect(() => {
    console.log('[useEffect: socket recv_message] userId:', userId, 'sessionId:', sessionId);
    socket.on('recv_message', async (data) => {
      console.log('[recv_message] Received data:', data);
      setChatMessage(prev => [...prev, { message: data, self: false }]);
      if (userId) {
        try {
          await fetch(`${API_BASE_URL}/api/chat/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, sessionId, message: data, sender: 'bot' })
          });
          console.log('[recv_message] Bot message saved.');
        } catch (e) {
          console.error('[recv_message] Error saving bot message:', e);
        }
      }
    });
    return () => {
      console.log('[useEffect socket cleanup] Removing recv_message listener.');
      socket.off('recv_message');
    };
  }, [userId, sessionId]);

  // Scroll to bottom on chat changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      console.log('[useEffect: Scroll to bottom]');
    }
  }, [chatMessage]);

  // New chat button with logs
  const handleNewChat = async () => {
    const currentUserId = sessionStorage.getItem('userId');
    console.log('[handleNewChat] currentUserId:', currentUserId);
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/startSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          title: "New Chat"
        })
      });
      if (!res.ok) {
        throw new Error('Failed to start a new session on the server.');
      }
      const newSession = await res.json();
      setChatHistory(prevHistory => [...prevHistory, newSession]);
      setChatMessage([{ message: "Starting a new conversation!", self: false }]);
      setSessionId(newSession._id);
      sessionStorage.setItem('sessionId', newSession._id);
      console.log('[handleNewChat] New session started:', newSession);
    } catch (error) {
      console.error("[handleNewChat] Error creating new chat:", error);
      setChatMessage([{ message: "Could not start a new chat.", self: false }]);
    }
  };

  return (
    <div className="App flex w-full h-screen text-white" style={{
      backgroundImage: `url(${backgroundImage})`, backgroundPosition: 'center',
      backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backdropFilter: 'blur(20px)'
    }}>
      {menuOpen && (
        <aside className="w-80 h-full bg-gray-900 text-white p-4 shadow-lg z-50">
          <button className="text-lg font-bold mb-4" onClick={() => setMenuOpen(false)}>Close</button>
          <button onClick={handleNewChat} className="w-full py-2 px-4 bg-green-600 rounded-md font-bold mb-2">New Chat</button>
          <h2 className="text-lg font-bold mb-2">Chat History</h2>
          <ul className="space-y-2">
            {chatHistory.map((chat, index) => (
              <li key={index} className="relative bg-gray-700 rounded-md px-4 py-2">
                <div className="flex justify-between items-center">
                  <button className="text-left w-full"
                    onClick={() => {
                      console.log('[Sidebar Chat Clicked] index:', index, 'chat:', chat);
                      fetchMessagesForSession(chat._id);
                    }}>
                    {chat.title || `Chat ${index + 1}`}
                  </button>
                  <HiDotsVertical
                    className="ml-2 cursor-pointer"
                    onClick={() => {
                      setActiveDropdown(activeDropdown === index ? null : index);
                      console.log('[Sidebar Dots Clicked] index:', index);
                    }}
                  />
                </div>
                {activeDropdown === index && (
                  <div className="absolute right-0 mt-1 bg-white text-black rounded-md shadow-md z-50">
                    <button
                      onClick={() => {
                        setPendingRename({ sessionId: chat._id, index });
                        setRenameValue(chat.title);
                        setShowRenameDialog(true);
                        setActiveDropdown(null);
                        console.log('[Sidebar: Rename] Clicked', chat._id);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setPendingDelete({ sessionId: chat._id, index });
                        setShowConfirm(true);
                        setActiveDropdown(null);
                        console.log('[Sidebar: Delete] Clicked', chat._id);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className={`flex flex-col w-full ${menuOpen ? 'ml-64' : ''}`}>
        <header className="flex items-center justify-between w-full h-16 p-4 bg-brown-500 text-black shadow-md">
          <div className="flex items-center">
            <button className="focus:outline-none mr-4" onClick={() => {
              setMenuOpen(prev => !prev);
              console.log('[Header] Menu toggled. menuOpen:', !menuOpen);
            }}>
              <div className="flex flex-col space-y-1">
                <span className="block w-6 h-1 bg-black"></span>
                <span className="block w-6 h-1 bg-black"></span>
                <span className="block w-6 h-1 bg-black"></span>
              </div>
            </button>
            <h1 className="text-3xl font-bold">MediBot</h1>
          </div>
          {userId && (
            <div className="relative">
              <button onClick={() => {
                setProfileMenuOpen(prev => !prev);
                console.log('[Header] Profile menu toggled. profileMenuOpen:', !profileMenuOpen);
              }}
                className="rounded-full w-10 h-10 bg-blue-600 text-white font-bold flex items-center justify-center">
                {userDetails.name?.[0]?.toUpperCase() || 'U'}
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded-md shadow-lg z-50">
                  <p className="p-2 border-b font-semibold">{userDetails.email || sessionStorage.getItem('userEmail')}</p>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Help</button>
                  <button onClick={() => setShowLogoutConfirm(true)} className="w-full text-left px-4 py-2 hover:bg-gray-100">Log out</button>
                </div>
              )}
            </div>
          )}
        </header>
        <main className="flex flex-col w-full flex-grow overflow-auto p-4 space-y-4">
          <section ref={chatContainerRef} className="flex flex-col w-full h-full overflow-auto">
            {chatMessage.map((item, key) => (
              <div key={key} className={`max-w-3/4 py-2 px-4 text-lg rounded-3xl ${item.self ? 'bg-green-200 ml-auto text-black' : 'bg-gray-200 mr-auto text-black'} my-2`}>
                {item.message.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
              </div>
            ))}
          </section>
        </main>
        <footer className="flex flex-col w-full p-4 bg-brown-500">
          {selectedFile && (
            <div className="relative w-max mb-2 p-2 bg-gray-700 rounded-lg flex items-center">
              {selectedFile.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-md mr-2"
                />
              ) : (
                <div className="flex items-center mr-2">
                  <span className="text-4xl">📄</span>
                </div>
              )}
              <span className="text-white text-sm truncate">{selectedFile.name}</span>
              <button
                onClick={removeSelectedFile}
                className="absolute -top-2 -right-2 bg-gray-800 text-white w-6 h-6 rounded-full flex justify-center items-center border-2 border-brown-500 hover:bg-red-500"
                aria-label="Remove file"
              >
                &times;
              </button>
            </div>
          )}
          <div className="flex w-full h-16 justify-center items-center">
            <label htmlFor="file-upload" className="mr-2 cursor-pointer bg-gray-600 px-4 py-2 rounded-full">
              📎
            </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/jpeg,image/png,application/pdf"
            />
            <input
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  console.log('[Input] Enter pressed.');
                  socketEmit();
                }
              }}
              placeholder="Enter message"
              className="rounded-full w-3/4 bg-gray-800 py-2 px-4 border-2 border-gray-700 text-white focus:outline-none"
              onChange={(e) => {
                setText(e.target.value);
                console.log('[Input] Text changed:', e.target.value);
              }}
              type="text"
              value={text}
            />
            <button onClick={() => {
              console.log('[Footer] Send button clicked');
              socketEmit();
            }} className="ml-2 bg-green-500 px-4 py-2 rounded-full">
              <img src={send_svg} className="w-6" alt="Send" />
            </button>
          </div>
        </footer>
      </div>
      {showConfirm && (
        <ConfirmDialog
          title="Confirm Delete"
          message="Are you sure you want to delete this chat?"
          confirmText="Delete"
          onCancel={() => {
            console.log('[ConfirmDialog] Delete canceled');
            setShowConfirm(false);
          }}
          onConfirm={async () => {
            console.log('[ConfirmDialog] Deletion confirmed');
            await confirmDelete();
            setShowConfirm(false);
            setPendingDelete(null);
          }}
        />
      )}
      {showRenameDialog && (
        <ConfirmDialog
          title="Rename Chat"
          message={(
            <input
              className="border p-2 w-full"
              value={renameValue}
              onChange={e => {
                setRenameValue(e.target.value);
                console.log('[RenameDialog] New value:', e.target.value);
              }}
              placeholder="Enter new chat name"
            />
          )}
          confirmText="Rename"
          onCancel={() => {
            console.log('[RenameDialog] Rename canceled');
            setShowRenameDialog(false);
          }}
          onConfirm={async () => {
            console.log('[RenameDialog] Rename confirmed', pendingRename, renameValue);
            await renameChat(pendingRename.sessionId, renameValue, pendingRename.index);
            setShowRenameDialog(false);
            setPendingRename(null);
          }}
        />
      )}
      {showLogoutConfirm && (
        <ConfirmDialog
          title="Confirm Logout"
          message="Are you sure you want to log out?"
          confirmText="Log out"
          onCancel={() => {
            setShowLogoutConfirm(false);
            console.log('[LogoutDialog] Cancel logout');
          }}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
            console.log('[LogoutDialog] Logout performed');
          }}
        />
      )}
    </div>
  );
}

export default App;
