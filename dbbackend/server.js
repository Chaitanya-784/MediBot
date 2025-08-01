require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const PORT = process.env.PORT || 5001;


const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
app.use(cors({
  origin: 'https://medibot-qaaq5buwq-chaitanya-gholaps-projects.vercel.app' 
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});