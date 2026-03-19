const express = require('express');
const multer = require('multer');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: 'music-streaming-secret-key-karan09',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false // Set to true if using HTTPS
  }
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Database (JSON file-based for simplicity)
const DB_FILE = path.join(__dirname, 'database.json');

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading database:', error);
  }
  return { songs: [] };
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// Initialize database
if (!fs.existsSync(DB_FILE)) {
  writeDB({ songs: [] });
}

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === 'karan09@') {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check admin status
app.get('/api/admin/status', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// Get all songs
app.get('/api/songs', (req, res) => {
  const db = readDB();
  res.json(db.songs);
});

// Upload song (admin only)
app.post('/api/songs/upload', requireAdmin, upload.single('songFile'), (req, res) => {
  try {
    const { songName, artistName } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const db = readDB();
    
    const newSong = {
      id: uuidv4(),
      name: songName || req.file.originalname.replace(/\.[^/.]+$/, ''),
      artist: artistName || 'Unknown Artist',
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString()
    };

    db.songs.push(newSong);
    writeDB(db);

    res.json({ success: true, song: newSong });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete song (admin only)
app.delete('/api/songs/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    
    const songIndex = db.songs.findIndex(s => s.id === id);
    
    if (songIndex === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = db.songs[songIndex];
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, 'public', 'uploads', song.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from database
    db.songs.splice(songIndex, 1);
    writeDB(db);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Update song (admin only)
app.put('/api/songs/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, artist } = req.body;
    const db = readDB();
    
    const song = db.songs.find(s => s.id === id);
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    if (name) song.name = name;
    if (artist) song.artist = artist;

    writeDB(db);

    res.json({ success: true, song });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Get local network IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  
  console.log('\n🎵 ========================================');
  console.log('   MUSIC STREAMING SERVER STARTED!');
  console.log('========================================');
  console.log(`\n📱 Access from this device:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n📱 Access from other devices on WiFi:`);
  console.log(`   http://${localIP}:${PORT}`);
  console.log(`\n📁 Uploads directory: ${path.join(__dirname, 'public', 'uploads')}`);
  console.log(`🔐 Admin password: karan09@`);
  console.log(`\n💡 Triple-click the logo to access admin panel`);
  console.log('========================================\n');
});
