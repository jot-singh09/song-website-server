# WhatsApp-Like Chat Application

A real-time chat application with WhatsApp-style UI, featuring OPBNB wallet authentication, light/dark themes, and media sharing capabilities.

## Features

✅ **Authentication**
- OPBNB wallet address registration
- User ID-based login
- One wallet address per account
- Password protection

✅ **Real-time Messaging**
- Instant message delivery via Socket.IO
- Message status indicators:
  - ✓ Single tick: Sent
  - ✓✓ Double tick: Delivered
  - ✓✓ Blue tick: Read
- Typing indicators
- Online/offline status

✅ **Media Sharing**
- Image uploads
- Video uploads
- Audio uploads
- File attachments
- Up to 50MB file size

✅ **UI/UX**
- WhatsApp-inspired interface
- Mobile-optimized (428px width)
- Light & Dark themes with purple accent
- Smooth animations and transitions
- Toast notifications

✅ **Additional Features**
- Add contacts by User ID
- User ID display and copy
- Conversation list with unread counts
- Message timestamps
- Responsive design

## Tech Stack

**Backend:**
- Node.js
- Express.js
- Socket.IO (real-time communication)
- Multer (file uploads)

**Frontend:**
- Vanilla JavaScript
- Socket.IO Client
- Modern CSS with CSS Variables
- Google Fonts (Poppins)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Instructions

1. **Install Server Dependencies**
```bash
cd server
npm install
```

2. **Install Client Dependencies**
```bash
cd client
npm install
```

3. **Start the Server**
```bash
cd server
npm start
```
Server will run on `http://localhost:3001`

4. **Start the Client**
```bash
cd client
npm start
```
Client will run on `http://localhost:3000`

5. **Open in Browser**
Navigate to `http://localhost:3000`

## Usage

### Registration
1. Click "Register" on the login screen
2. Enter your OPBNB wallet address (must start with 0x)
3. Create a password and confirm it
4. Accept the terms and conditions
5. Click "Register"
6. Copy your generated User ID
7. You'll be automatically logged in

### Login
1. Enter your wallet address OR User ID
2. Enter your password
3. Click "Sign In"

### Adding Contacts
1. Click the + button in the bottom-right corner
2. Enter the User ID of the contact you want to add
3. Click "Add Contact"
4. Start chatting!

### Sending Messages
1. Select a conversation from the list
2. Type your message in the input field
3. Press Enter or click the send button
4. Watch for message status indicators

### Sending Media
1. Click the attachment icon
2. Select an image, video, audio file, or document
3. The file will be uploaded and sent with your next message

### Theme Switching
- Click the sun/moon icon in the top-right corner to toggle between light and dark themes

## Project Structure

```
whatsapp-clone/
├── server/
│   ├── package.json
│   ├── server.js
│   └── uploads/          (created automatically)
├── client/
│   ├── package.json
│   ├── server.js
│   └── public/
│       ├── index.html
│       ├── styles.css
│       └── app.js
└── README.md
```

## Configuration

### API URL
The client is configured to connect to `http://localhost:3001` by default. To change this, edit the `API_URL` constant in `client/public/app.js`:

```javascript
const API_URL = 'http://localhost:3001';
```

### File Upload Limits
The server accepts files up to 50MB. To change this, edit the multer configuration in `server/server.js`:

```javascript
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
```

### Port Configuration
**Server Port:** Edit `server/server.js`
```javascript
const PORT = process.env.PORT || 3001;
```

**Client Port:** Edit `client/server.js`
```javascript
const PORT = process.env.PORT || 3000;
```

## Production Deployment

⚠️ **Important:** This is a demo application. For production use:

1. **Security:**
   - Use proper password hashing (bcrypt)
   - Implement JWT authentication
   - Add rate limiting
   - Validate all inputs
   - Use HTTPS

2. **Database:**
   - Replace in-memory storage with a real database (MongoDB, PostgreSQL, etc.)
   - Implement proper data persistence

3. **File Storage:**
   - Use cloud storage (AWS S3, Cloudinary, etc.)
   - Implement proper file validation
   - Add virus scanning

4. **Environment Variables:**
   - Use .env files for configuration
   - Never commit sensitive data

5. **Scaling:**
   - Use Redis for Socket.IO adapter (multi-server support)
   - Implement load balancing
   - Add CDN for static assets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Support

Optimized for mobile devices with screen width of 428px (iPhone 14 Pro Max size). Works on all modern mobile browsers.

## Troubleshooting

### Connection Issues
- Make sure both server and client are running
- Check that ports 3000 and 3001 are not in use
- Verify the API_URL in app.js matches your server URL

### File Upload Issues
- Check file size (must be under 50MB)
- Verify uploads directory has write permissions
- Check browser console for errors

### Socket.IO Connection Failed
- Ensure server is running
- Check CORS configuration
- Verify Socket.IO client version matches server

## License

MIT License - feel free to use this project for learning and development.

## Credits

Designed and developed as a WhatsApp-inspired chat application demo.

---

**Note:** This is a demonstration project and should not be used in production without proper security implementations.
