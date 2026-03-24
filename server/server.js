const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// In-memory database (in production, use a real database)
const users = new Map();
const walletAddresses = new Set();
const messages = new Map(); // Map of conversationId -> messages array
const conversations = new Map(); // Map of userId -> array of conversation partners
const onlineUsers = new Map(); // Map of userId -> socketId

// API Routes

// Register new user
app.post('/api/register', (req, res) => {
  const { walletAddress, password } = req.body;

  if (!walletAddress || !password) {
    return res.status(400).json({ error: 'Wallet address and password are required' });
  }

  if (walletAddresses.has(walletAddress.toLowerCase())) {
    return res.status(400).json({ error: 'Wallet address already registered' });
  }

  const userId = `USER${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const user = {
    userId,
    walletAddress: walletAddress.toLowerCase(),
    password, // In production, hash this!
    createdAt: new Date().toISOString()
  };

  users.set(userId, user);
  walletAddresses.add(walletAddress.toLowerCase());
  conversations.set(userId, []);

  res.json({ 
    success: true, 
    userId,
    message: 'Registration successful' 
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  let user = null;
  
  // Check if identifier is userId
  if (users.has(identifier)) {
    user = users.get(identifier);
  } else {
    // Check if identifier is wallet address
    for (let [userId, userData] of users.entries()) {
      if (userData.walletAddress === identifier.toLowerCase()) {
        user = userData;
        break;
      }
    }
  }

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ 
    success: true, 
    userId: user.userId,
    walletAddress: user.walletAddress
  });
});

// Get user by ID
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ 
    userId: user.userId,
    online: onlineUsers.has(userId)
  });
});

// Get conversations for a user
app.get('/api/conversations/:userId', (req, res) => {
  const { userId } = req.params;
  const userConversations = conversations.get(userId) || [];
  
  const conversationsList = userConversations.map(partnerId => {
    const partner = users.get(partnerId);
    const conversationId = getConversationId(userId, partnerId);
    const msgs = messages.get(conversationId) || [];
    const lastMessage = msgs[msgs.length - 1];
    const unreadCount = msgs.filter(m => m.to === userId && !m.read).length;

    return {
      partnerId,
      partnerUserId: partner?.userId || partnerId,
      lastMessage: lastMessage ? lastMessage.text : '',
      timestamp: lastMessage ? lastMessage.timestamp : null,
      unreadCount,
      online: onlineUsers.has(partnerId)
    };
  });

  res.json(conversationsList);
});

// Get messages for a conversation
app.get('/api/messages/:userId/:partnerId', (req, res) => {
  const { userId, partnerId } = req.params;
  const conversationId = getConversationId(userId, partnerId);
  const msgs = messages.get(conversationId) || [];

  // Mark messages as read
  msgs.forEach(msg => {
    if (msg.to === userId && !msg.read) {
      msg.read = true;
      msg.readAt = new Date().toISOString();
    }
  });

  res.json(msgs);
});

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype.split('/')[0]; // image, video, audio, application

  res.json({
    success: true,
    fileUrl,
    fileType,
    fileName: req.file.originalname,
    fileSize: req.file.size
  });
});

// Helper function to create conversation ID
function getConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User goes online
  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    
    // Notify all user's contacts
    const userConversations = conversations.get(userId) || [];
    userConversations.forEach(partnerId => {
      const partnerSocketId = onlineUsers.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('user_status', { userId, online: true });
      }
    });
  });

  // Add new contact
  socket.on('add_contact', ({ userId, contactId }) => {
    const contact = users.get(contactId);
    
    if (!contact) {
      socket.emit('contact_error', { error: 'User not found' });
      return;
    }

    // Add to both users' conversations
    const userConvos = conversations.get(userId) || [];
    const contactConvos = conversations.get(contactId) || [];

    if (!userConvos.includes(contactId)) {
      userConvos.push(contactId);
      conversations.set(userId, userConvos);
    }

    if (!contactConvos.includes(userId)) {
      contactConvos.push(userId);
      conversations.set(contactId, contactConvos);
    }

    socket.emit('contact_added', { 
      partnerId: contactId,
      partnerUserId: contact.userId,
      online: onlineUsers.has(contactId)
    });
  });

  // Send message
  socket.on('send_message', (data) => {
    const { from, to, text, fileUrl, fileType, fileName, fileSize } = data;
    const conversationId = getConversationId(from, to);
    
    const message = {
      id: uuidv4(),
      from,
      to,
      text: text || '',
      fileUrl: fileUrl || null,
      fileType: fileType || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      timestamp: new Date().toISOString(),
      delivered: false,
      read: false
    };

    // Store message
    if (!messages.has(conversationId)) {
      messages.set(conversationId, []);
    }
    messages.get(conversationId).push(message);

    // Send to sender (confirmation)
    socket.emit('message_sent', message);

    // Send to recipient if online
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      message.delivered = true;
      io.to(recipientSocketId).emit('receive_message', message);
      
      // Send delivery confirmation back to sender
      socket.emit('message_delivered', { messageId: message.id });
    }
  });

  // Message read receipt
  socket.on('message_read', ({ messageId, conversationId }) => {
    const msgs = messages.get(conversationId) || [];
    const message = msgs.find(m => m.id === messageId);
    
    if (message && !message.read) {
      message.read = true;
      message.readAt = new Date().toISOString();

      // Notify sender
      const senderSocketId = onlineUsers.get(message.from);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_read_receipt', { messageId });
      }
    }
  });

  // Mark all messages in conversation as read
  socket.on('mark_conversation_read', ({ userId, partnerId }) => {
    const conversationId = getConversationId(userId, partnerId);
    const msgs = messages.get(conversationId) || [];
    
    msgs.forEach(msg => {
      if (msg.to === userId && !msg.read) {
        msg.read = true;
        msg.readAt = new Date().toISOString();
        
        // Notify sender
        const senderSocketId = onlineUsers.get(msg.from);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_read_receipt', { messageId: msg.id });
        }
      }
    });
  });

  // Typing indicator
  socket.on('typing', ({ from, to }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { userId: from });
    }
  });

  socket.on('stop_typing', ({ from, to }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_stop_typing', { userId: from });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId) {
      onlineUsers.delete(userId);
      
      // Notify all user's contacts
      const userConversations = conversations.get(userId) || [];
      userConversations.forEach(partnerId => {
        const partnerSocketId = onlineUsers.get(partnerId);
        if (partnerSocketId) {
          io.to(partnerSocketId).emit('user_status', { userId, online: false });
        }
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
