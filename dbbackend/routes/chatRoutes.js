// 📁 routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// Save chat message
const mongoose = require('mongoose');




const Session = require('../models/Session');

// Start new session
// In 📁 routes/chatRoutes.js

router.post('/startSession', async (req, res) => {
  const { userId, title } = req.body;
  
  // --- ADD THIS LOG ---
  console.log('[Backend /startSession] Received request to start session for userId:', userId, 'with title:', title);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    // --- ADD THIS LOG ---
    console.error('[Backend /startSession] Invalid or missing userId.');
    return res.status(400).json({ error: 'Invalid or missing userId' });
  }

  const session = new Session({ userId, title });
  try {
    await session.save();
    
    // --- ADD THIS LOG ---
    console.log('[Backend /startSession] Successfully saved new session:', session);
    
    res.json(session);
  } catch (err) {
    console.error('[Backend /startSession] Error creating session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});


router.post('/save', async (req, res) => {
  const { userId, sessionId, message, sender } = req.body;

  // Check if sessionId is a valid ObjectId
  if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ error: 'Invalid sessionId provided' });
  }

  if (!message || !sender) {
    return res.status(400).json({ error: 'Message and sender are required' });
  }

  try {
    const chat = new Chat({ userId, sessionId, message, sender });
    await chat.save();
    res.json({ message: 'Saved' });
  } catch (err) {
    console.error('Error saving chat:', err);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

// Rename session
router.put('/session/:sessionId', async (req, res) => {
  const { title } = req.body;
  const session = await Session.findByIdAndUpdate(req.params.sessionId, { title }, { new: true });
  res.json(session);
});

// Get sessions
router.get('/sessions/user/:userId', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.params.userId }).sort({ createdAt: 'desc' });
    res.json(sessions);
  } catch (err) {
    console.error("Error fetching sessions for user:", err);
    res.status(500).json({ error: "Failed to fetch user sessions." });
  }
});
// Get messages in a session
// Get messages in a session
// CORRECTED CODE
// CORRECTED CODE
router.get('/messages/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Use the correct "Chat" model that you imported at the top
    const messages = await Chat.find({ sessionId }).sort({ timestamp: 'asc' });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});



// Delete session and its messages
router.delete('/session/:sessionId', async (req, res) => {
  await Chat.deleteMany({ sessionId: req.params.sessionId });
  await Session.findByIdAndDelete(req.params.sessionId);
  res.json({ message: "Deleted session" });
});


// Get chat history
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  const history = await Chat.find({ userId }).sort({ timestamp: 1 });
  res.json(history);
});

module.exports = router;
