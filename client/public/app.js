// API Configuration
const API_URL = 'http://localhost:3001';
const socket = io(API_URL);

// Global State
let currentUser = null;
let activeConversation = null;
let conversations = [];
let messages = {};
let typingTimeout = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  
  // Check if user is logged in
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showScreen('chatScreen');
    initializeChat();
  }
});

function initializeApp() {
  // Initialize theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function setupEventListeners() {
  // Login form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  
  // Register form
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  
  // Switch between login and register
  document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    showScreen('registerScreen');
  });
  
  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showScreen('loginScreen');
  });
  
  // Message input
  const messageInput = document.getElementById('messageInput');
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  messageInput.addEventListener('input', handleTyping);
  
  // File input
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
  
  // Socket events
  setupSocketListeners();
}

function setupSocketListeners() {
  socket.on('connect', () => {
    console.log('Connected to server');
    if (currentUser) {
      socket.emit('user_online', currentUser.userId);
    }
  });
  
  socket.on('contact_added', (data) => {
    addConversationToList(data);
    showToast('Contact added successfully!', 'success');
    closeAddContactModal();
  });
  
  socket.on('contact_error', (data) => {
    showToast(data.error, 'error');
  });
  
  socket.on('receive_message', (message) => {
    handleReceivedMessage(message);
  });
  
  socket.on('message_delivered', ({ messageId }) => {
    updateMessageStatus(messageId, 'delivered');
  });
  
  socket.on('message_read_receipt', ({ messageId }) => {
    updateMessageStatus(messageId, 'read');
  });
  
  socket.on('user_status', ({ userId, online }) => {
    updateUserStatus(userId, online);
  });
  
  socket.on('user_typing', ({ userId }) => {
    if (activeConversation?.partnerId === userId) {
      showTypingIndicator();
    }
  });
  
  socket.on('user_stop_typing', ({ userId }) => {
    if (activeConversation?.partnerId === userId) {
      hideTypingIndicator();
    }
  });
}

// Authentication Functions
async function handleLogin(e) {
  e.preventDefault();
  
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = {
        userId: data.userId,
        walletAddress: data.walletAddress
      };
      
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showScreen('chatScreen');
      initializeChat();
      showToast('Login successful!', 'success');
    } else {
      showToast(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Connection error. Please try again.', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const walletAddress = document.getElementById('registerWallet').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const agreeTerms = document.getElementById('agreeTerms').checked;
  
  if (password !== confirmPassword) {
    showToast('Passwords do not match!', 'error');
    return;
  }
  
  if (!agreeTerms) {
    showToast('Please agree to the terms and conditions', 'error');
    return;
  }
  
  if (!walletAddress.startsWith('0x') || walletAddress.length < 42) {
    showToast('Please enter a valid wallet address', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Hide form and show user ID
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('userIdDisplay').style.display = 'block';
      document.getElementById('displayedUserId').textContent = data.userId;
      
      currentUser = {
        userId: data.userId,
        walletAddress: walletAddress
      };
      
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      showToast(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showToast('Connection error. Please try again.', 'error');
  }
}

function copyUserId() {
  const userId = document.getElementById('displayedUserId').textContent;
  navigator.clipboard.writeText(userId).then(() => {
    showToast('User ID copied!', 'success');
  });
}

function proceedToChat() {
  showScreen('chatScreen');
  initializeChat();
}

// Chat Functions
async function initializeChat() {
  document.getElementById('currentUserId').textContent = currentUser.userId;
  socket.emit('user_online', currentUser.userId);
  
  await loadConversations();
}

async function loadConversations() {
  try {
    const response = await fetch(`${API_URL}/api/conversations/${currentUser.userId}`);
    const data = await response.json();
    
    conversations = data;
    renderConversations();
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
}

function renderConversations() {
  const container = document.getElementById('conversationsList');
  
  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="no-conversations">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>No conversations yet</p>
        <small>Click the + button to start chatting</small>
      </div>
    `;
    return;
  }
  
  container.innerHTML = conversations.map(conv => {
    const time = conv.timestamp ? formatTime(new Date(conv.timestamp)) : '';
    return `
      <div class="conversation-item ${activeConversation?.partnerId === conv.partnerId ? 'active' : ''}" 
           onclick="openConversation('${conv.partnerId}')">
        <div class="avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          ${conv.online ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="conversation-content">
          <div class="conversation-header">
            <div class="conversation-name">${conv.partnerUserId}</div>
            <div class="conversation-time">${time}</div>
          </div>
          <div class="conversation-preview">${conv.lastMessage || 'No messages yet'}</div>
        </div>
        ${conv.unreadCount > 0 ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
      </div>
    `;
  }).join('');
}

async function openConversation(partnerId) {
  activeConversation = conversations.find(c => c.partnerId === partnerId);
  
  if (!activeConversation) {
    activeConversation = { partnerId };
  }
  
  // Update UI
  document.querySelector('.empty-chat').style.display = 'none';
  document.querySelector('.active-chat').style.display = 'flex';
  document.getElementById('partnerName').textContent = activeConversation.partnerUserId || partnerId;
  document.getElementById('partnerStatus').textContent = activeConversation.online ? 'online' : 'offline';
  document.getElementById('partnerStatus').className = `partner-status ${activeConversation.online ? 'online' : ''}`;
  
  // Load messages
  await loadMessages(partnerId);
  
  // Mark conversation as read
  socket.emit('mark_conversation_read', {
    userId: currentUser.userId,
    partnerId: partnerId
  });
  
  // Update conversation list
  renderConversations();
  
  // Hide sidebar on mobile
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.add('show-chat');
  }
}

async function loadMessages(partnerId) {
  try {
    const response = await fetch(`${API_URL}/api/messages/${currentUser.userId}/${partnerId}`);
    const data = await response.json();
    
    const conversationId = getConversationId(currentUser.userId, partnerId);
    messages[conversationId] = data;
    
    renderMessages();
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

function renderMessages() {
  if (!activeConversation) return;
  
  const container = document.getElementById('messagesContainer');
  const conversationId = getConversationId(currentUser.userId, activeConversation.partnerId);
  const msgs = messages[conversationId] || [];
  
  container.innerHTML = msgs.map(msg => {
    const isSent = msg.from === currentUser.userId;
    const time = formatTime(new Date(msg.timestamp));
    
    let statusIcon = '';
    if (isSent) {
      if (msg.read) {
        statusIcon = `
          <svg class="status-read" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 8 22 12 18 16"/>
            <polyline points="10 8 14 12 10 16"/>
          </svg>
        `;
      } else if (msg.delivered) {
        statusIcon = `
          <svg class="status-delivered" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 8 22 12 18 16"/>
            <polyline points="10 8 14 12 10 16"/>
          </svg>
        `;
      } else {
        statusIcon = `
          <svg class="status-sent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        `;
      }
    }
    
    let mediaContent = '';
    if (msg.fileUrl) {
      if (msg.fileType === 'image') {
        mediaContent = `<div class="message-media"><img src="${API_URL}${msg.fileUrl}" alt="Image"></div>`;
      } else if (msg.fileType === 'video') {
        mediaContent = `<div class="message-media"><video src="${API_URL}${msg.fileUrl}" controls></video></div>`;
      } else if (msg.fileType === 'audio') {
        mediaContent = `<div class="message-media"><audio src="${API_URL}${msg.fileUrl}" controls></audio></div>`;
      } else {
        mediaContent = `
          <div class="message-file">
            <div class="message-file-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
            </div>
            <div class="message-file-info">
              <div class="message-file-name">${msg.fileName}</div>
              <div class="message-file-size">${formatFileSize(msg.fileSize)}</div>
            </div>
          </div>
        `;
      }
    }
    
    return `
      <div class="message ${isSent ? 'sent' : 'received'}" data-id="${msg.id}">
        <div class="message-bubble">
          ${mediaContent}
          ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
          <div class="message-meta">
            <span class="message-time">${time}</span>
            ${isSent ? `<span class="message-status">${statusIcon}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text && !pendingFile) return;
  if (!activeConversation) return;
  
  let fileData = null;
  
  // Upload file if present
  if (pendingFile) {
    fileData = await uploadFile(pendingFile);
    pendingFile = null;
    document.getElementById('fileInput').value = '';
  }
  
  const messageData = {
    from: currentUser.userId,
    to: activeConversation.partnerId,
    text: text,
    ...(fileData && {
      fileUrl: fileData.fileUrl,
      fileType: fileData.fileType,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize
    })
  };
  
  socket.emit('send_message', messageData);
  
  input.value = '';
  socket.emit('stop_typing', {
    from: currentUser.userId,
    to: activeConversation.partnerId
  });
}

let pendingFile = null;

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    pendingFile = file;
    showToast(`File selected: ${file.name}`, 'success');
  }
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  } catch (error) {
    console.error('File upload error:', error);
    showToast('File upload failed', 'error');
    return null;
  }
}

function handleReceivedMessage(message) {
  const conversationId = getConversationId(message.from, message.to);
  
  if (!messages[conversationId]) {
    messages[conversationId] = [];
  }
  
  messages[conversationId].push(message);
  
  // If conversation is active, render the message
  if (activeConversation?.partnerId === message.from) {
    renderMessages();
    
    // Send read receipt
    socket.emit('message_read', {
      messageId: message.id,
      conversationId: conversationId
    });
  }
  
  // Update conversation list
  loadConversations();
  
  // Show notification if not in active conversation
  if (activeConversation?.partnerId !== message.from) {
    showToast(`New message from ${message.from}`, 'success');
  }
}

function updateMessageStatus(messageId, status) {
  if (!activeConversation) return;
  
  const conversationId = getConversationId(currentUser.userId, activeConversation.partnerId);
  const msgs = messages[conversationId] || [];
  
  const message = msgs.find(m => m.id === messageId);
  if (message) {
    if (status === 'delivered') {
      message.delivered = true;
    } else if (status === 'read') {
      message.read = true;
    }
    
    renderMessages();
  }
}

function updateUserStatus(userId, online) {
  const conversation = conversations.find(c => c.partnerId === userId);
  if (conversation) {
    conversation.online = online;
    renderConversations();
  }
  
  if (activeConversation?.partnerId === userId) {
    document.getElementById('partnerStatus').textContent = online ? 'online' : 'offline';
    document.getElementById('partnerStatus').className = `partner-status ${online ? 'online' : ''}`;
  }
}

function handleTyping() {
  if (!activeConversation) return;
  
  socket.emit('typing', {
    from: currentUser.userId,
    to: activeConversation.partnerId
  });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', {
      from: currentUser.userId,
      to: activeConversation.partnerId
    });
  }, 1000);
}

function showTypingIndicator() {
  document.getElementById('typingIndicator').style.display = 'flex';
}

function hideTypingIndicator() {
  document.getElementById('typingIndicator').style.display = 'none';
}

// Add Contact Functions
function showAddContactModal() {
  document.getElementById('addContactModal').classList.add('active');
  document.getElementById('contactUserId').value = '';
  document.getElementById('contactUserId').focus();
}

function closeAddContactModal() {
  document.getElementById('addContactModal').classList.remove('active');
}

async function addContact() {
  const contactId = document.getElementById('contactUserId').value.trim();
  
  if (!contactId) {
    showToast('Please enter a user ID', 'error');
    return;
  }
  
  if (contactId === currentUser.userId) {
    showToast('You cannot add yourself', 'error');
    return;
  }
  
  // Check if contact already exists
  if (conversations.some(c => c.partnerId === contactId)) {
    showToast('Contact already exists', 'error');
    return;
  }
  
  socket.emit('add_contact', {
    userId: currentUser.userId,
    contactId: contactId
  });
}

function addConversationToList(data) {
  conversations.push({
    partnerId: data.partnerId,
    partnerUserId: data.partnerUserId,
    lastMessage: '',
    timestamp: null,
    unreadCount: 0,
    online: data.online
  });
  
  renderConversations();
}

// Theme Toggle
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Utility Functions
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getConversationId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('addContactModal');
  if (e.target === modal) {
    closeAddContactModal();
  }
});
