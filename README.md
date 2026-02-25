# ✋ AirDraw — Gesture Drawing Studio

> Draw in the air using your webcam and hand gestures. Built with the MERN stack and MediaPipe hand tracking.

![Made with React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-FF6F00?style=flat)

---

## ✨ Features

| Feature | Description |
|---|---|
| ☝️ Air Drawing | Point your index finger to draw smooth strokes |
| ✌️ Gesture Eraser | Raise index + middle finger to erase |
| ✊ Pause Mode | Close your fist to stop drawing |
| 🎨 Color Palette | 6 preset colors + custom color picker |
| 📏 Brush Size | Adjustable from 2–30px |
| 💾 Save Gallery | Save drawings to MongoDB and browse them |
| 🦴 Hand Skeleton | Real-time color-coded hand skeleton overlay |
| 🎬 Cinematic UI | Dark film-editor aesthetic, fullscreen canvas |

---

## 🛠️ Tech Stack

- **Frontend** — React 18, Vite, MediaPipe Hands (CDN), react-webcam
- **Backend** — Node.js, Express, Mongoose
- **Database** — MongoDB

---

## 📁 Folder Structure

```
air-drawing-app/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DrawingCanvas.jsx
│   │   │   ├── HandTracking.jsx
│   │   │   ├── Toolbar.jsx
│   │   │   └── Gallery.jsx
│   │   ├── hooks/
│   │   │   └── useHandTracking.js
│   │   ├── utils/
│   │   │   └── handGestures.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── server/
    ├── models/
    │   └── Drawing.js
    ├── routes/
    │   └── drawings.js
    ├── server.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:
- [Node.js](https://nodejs.org) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally)
- A modern browser (Chrome recommended)

### 1. Clone the repo

```bash
git clone https://github.com/Ayushmansahoo098/air-drawing-app.git
cd air-drawing-app
```

### 2. Setup the server

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` folder:

```
MONGODB_URI=mongodb://localhost:27017/air-drawing
PORT=5001
```

### 3. Setup the client

```bash
cd ../client
npm install
```

### 4. Start MongoDB

```bash
brew services start mongodb-community
```

### 5. Run the app

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

### 6. Open in browser

```
http://localhost:3000
```

Allow camera access when prompted. Wait ~5 seconds for hand tracking to initialize.

---

## 🖐️ Gesture Controls

| Gesture | Action |
|---|---|
| ☝️ Index finger only | **DRAW** |
| ✌️ Index + middle finger | **ERASE** |
| ✊ Fist / all fingers closed | **PAUSE** |

---

## 🔌 API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/drawings` | Save a drawing (base64 image) |
| `GET` | `/api/drawings` | Get all saved drawings |
| `DELETE` | `/api/drawings/:id` | Delete a drawing |

---

## 🌐 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/air-drawing` | MongoDB connection string |
| `PORT` | `5001` | Server port |

---

## 🎨 Customization

Colors, fonts, and layout are controlled in `client/src/index.css`. The app uses:
- **Bebas Neue** — display headings
- **Inter** — body text
- **Space Mono** — labels and badges
- Gold `#c8a96e` as the primary accent color

---

## 📸 Screenshots

> Studio view with hand tracking active — draw by pointing your index finger at the camera.

---

## 👤 Author

**Ayushman Sahoo** — Cinematic Editor & Visual Storyteller

- Portfolio: [portfolio-ayush-man.vercel.app](https://portfolio-ayush-man.vercel.app)
- Instagram: [@ayushman_098](https://www.instagram.com/ayushman_098/)
- Email: ayushmansahoo098@gmail.com

---

## 📄 License

MIT — feel free to use and modify.
