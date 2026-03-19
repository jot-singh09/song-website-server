# 🎵 Spotify-Style Music Streaming Server

A complete Node.js music streaming server with Spotify-inspired mobile UI, admin panel, and full music management capabilities.

## ✨ Features

### 🎨 Mobile-First Design
- **480px optimized** - Perfect for mobile devices
- **Spotify UI** - Beautiful dark theme with green accents
- **No sidebar clutter** - Streamlined mobile interface
- **Touch-friendly** - Optimized for touch interactions

### 🎵 Player Features
- **Full music player** - Play/pause, next/previous
- **Progress bar** - Seekable playback control
- **10-second skip** - Forward and backward buttons
- **Loop controls** - None → One Song → All Songs
- **Volume control** - Mute/unmute functionality

### 🔐 Admin Panel
- **Triple-click access** - Click logo 3 times
- **Password protected** - `karan09@`
- **Upload songs** - MP3, WAV, OGG, etc.
- **Manage library** - Delete songs
- **Real-time updates** - Changes visible immediately

### 🌐 Network Features
- **WiFi accessible** - Access from any device on your network
- **Cross-platform** - Works on phones, tablets, computers
- **Persistent storage** - Songs stored on server
- **Session management** - Secure admin sessions

## 📦 Installation

### Prerequisites
- **Node.js 14+** - [Download here](https://nodejs.org/)
- **npm** - Comes with Node.js

### Setup Steps

1. **Extract the ZIP file**
   ```bash
   unzip spotify-music-server.zip
   cd spotify-music-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   For development (auto-restart):
   ```bash
   npm run dev
   ```

4. **Access the app**
   - **From this device:** `http://localhost:3000`
   - **From other devices:** `http://YOUR_IP:3000`
   
   The server will display both URLs when it starts!

## 📱 How to Use

### For Users:
1. Open the app in your browser
2. Browse artists and songs
3. Click any song to play it
4. Use search to find music
5. Control playback with bottom player:
   - 🔁 **Loop** - Cycle through modes
   - ⏪ **-10s** - Skip backward
   - ⏮️ **Previous** - Previous song
   - ▶️ **Play/Pause** - Toggle playback
   - ⏭️ **Next** - Next song
   - ⏩ **+10s** - Skip forward
   - 🔊 **Mute** - Toggle sound

### For Admins:
1. **Triple-click** the "Streaming" logo (top-left)
2. Enter password: `karan09@`
3. Upload songs:
   - Enter song name
   - Enter artist name
   - Choose audio file
   - Click upload
4. Manage songs:
   - View all uploaded songs
   - Delete songs with one click
5. Songs are instantly available to all users!

## 🌐 Accessing from WiFi

When you start the server, you'll see:
```
🎵 ========================================
   MUSIC STREAMING SERVER STARTED!
========================================

📱 Access from this device:
   http://localhost:3000

📱 Access from other devices on WiFi:
   http://192.168.1.XXX:3000

📁 Uploads directory: /path/to/uploads
🔐 Admin password: karan09@

💡 Triple-click the logo to access admin panel
========================================
```

Share the WiFi URL with anyone on your network!

## 🔧 Configuration

### Change Admin Password
Edit `server.js` line 82:
```javascript
if (password === 'your-new-password') {
```

### Change Port
Edit `server.js` line 10 or set environment variable:
```javascript
const PORT = process.env.PORT || 3000;
```

Or run with custom port:
```bash
PORT=8080 npm start
```

### Upload Limits
Edit `server.js` line 45:
```javascript
limits: { fileSize: 50 * 1024 * 1024 } // 50MB
```

## 📁 Project Structure

```
spotify-music-server/
├── server.js              # Main server file
├── package.json           # Dependencies
├── database.json          # Song database (auto-created)
├── public/
│   ├── index.html        # Frontend UI
│   └── uploads/          # Uploaded songs (auto-created)
└── README.md             # This file
```

## 🛠️ Technology Stack

- **Backend:** Node.js, Express
- **File Upload:** Multer
- **Session:** express-session
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Audio:** HTML5 Audio API
- **Icons:** Font Awesome 6

## 🚀 Deployment Options

### Option 1: Local Network (Current Setup)
- Run `npm start`
- Access from any device on your WiFi
- Perfect for home use

### Option 2: Cloud Deployment

#### Heroku
```bash
# Install Heroku CLI
heroku login
heroku create your-app-name
git init
git add .
git commit -m "Initial commit"
git push heroku master
```

#### Railway
1. Go to [railway.app](https://railway.app/)
2. Connect GitHub repository
3. Deploy automatically

#### DigitalOcean
1. Create a Droplet
2. SSH into server
3. Install Node.js
4. Upload files
5. Run with PM2:
```bash
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Option 3: Make Accessible from Internet

Use **ngrok** for testing:
```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm start

# In another terminal
ngrok http 3000
```

Ngrok will give you a public URL like `https://abc123.ngrok.io`

## 🔒 Security Notes

- Change the admin password in production
- Use HTTPS for public deployment
- Consider adding rate limiting
- Implement proper authentication for production
- Don't expose to internet without security measures

## ⚠️ Important Notes

- **Storage:** Songs stored in `public/uploads/`
- **Database:** JSON file-based (simple but not for huge scale)
- **Max file size:** 50MB per song (configurable)
- **Supported formats:** MP3, WAV, OGG, and most audio formats
- **Sessions:** Admin sessions last 24 hours

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Make sure Node.js is installed: `node --version`
- Try a different port: `PORT=8080 npm start`

### Can't access from other devices
- Check firewall settings
- Make sure devices are on same WiFi
- Try using IP address shown in console

### Can't upload songs
- Check admin login status
- Verify file is audio format
- Check file size (max 50MB)
- Ensure uploads directory exists

### Songs won't play
- Check browser console for errors
- Try different audio format
- Make sure file uploaded correctly

## 📝 API Endpoints

```
GET  /                      - Home page
GET  /api/songs             - Get all songs
POST /api/admin/login       - Admin login
POST /api/admin/logout      - Admin logout
GET  /api/admin/status      - Check admin status
POST /api/songs/upload      - Upload song (admin only)
DELETE /api/songs/:id       - Delete song (admin only)
PUT  /api/songs/:id         - Update song (admin only)
```

## 💡 Tips

- **Upload quality music** - Higher bitrate = better sound
- **Organize by artist** - Name artists consistently
- **Use descriptive names** - Makes searching easier
- **Regular backups** - Backup `database.json` and `uploads/` folder

## 👨‍💻 Created By

**Karanjot Singh**

## 📄 License

MIT License - Feel free to use and modify!

---

**Enjoy your music streaming server!** 🎵

For issues or questions, check the troubleshooting section above.
