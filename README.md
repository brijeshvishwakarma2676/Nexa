# Nexa - Social Media Platform

Nexa is a modern, full-stack social media application designed to connect friends, share moments, and discover amazing stories. It features a responsive UI, real-time chat, and a robust backend.

## 🚀 Features

- **User Authentication**: Secure signup/login with JWT and Google OAuth support.
- **News Feed**: Dynamic feed with posts, likes, comments, and shares.
- **User Profiles**: Customizable profiles with intro details (bio, workplace, etc.), photos, and timeline.
- **Social Graph**: Friend system, following/followers list (one-sided follows), and mutual friends.
- **Real-time Chat**: Instant messaging with WebSocket integration.
- **Notifications**: Real-time updates for likes, comments, and friend requests.
- **Media Support**: Image uploads for posts, avatars, and cover photos with optimization.
- **PWA Support**: Installable as a native-like app on mobile and desktop with offline capabilities.
- **Responsive Design**: Mobile-first approach with a bottom navigation bar for small screens.
- **Search**: Global search for users and friends.

## 🛠️ Tech Stack

### Frontend (`Nexa`)
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, PostCSS
- **State Management**: Zustand
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **PWA**: Custom Service Worker & Manifest
- **Utilities**: date-fns, react-hot-toast

### Backend (`nexa-backend`)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL / SQLite (for dev)
- **ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens)
- **Image Processing**: Pillow
- **Real-time**: WebSockets

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/brijeshvishwakarma2676/Nexa.git
cd Nexa
```

### 2. Backend Setup
Navigate to the backend directory:
```bash
cd nexa-backend
```

Create a virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Set up Environment Variables:
Create a `.env` file in `nexa-backend/` and add:
```env
DATABASE_URL=sqlite:///./nexa.db
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Run the Backend Server:
```bash
# Uses uvicorn
python -m app.main
# Server will start at http://localhost:8000
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```bash
cd Nexa
```

Install dependencies:
```bash
npm install
```

Set up Environment Variables:
Create a `.env` file in `Nexa/` (if using custom backend URL):
```env
VITE_API_URL=http://localhost:8000
```

Run the Frontend Development Server:
```bash
npm run dev
# App will start at http://localhost:5173
```

## 📱 PWA Instructions
Nexa is a Progressive Web App. You can install it on your device:
- **Desktop (Chrome/Edge)**: Click the "Install Nexa" icon in the address bar.
- **Mobile (Android/iOS)**: Tap "Add to Home Screen" from the browser menu or use the in-app install prompt.

## 📂 Project Structure

```
Nexa/
├── public/              # Static assets (icons, manifest, sw.js)
├── src/
│   ├── assets/          # Images and logos
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page views (Feed, Profile, etc.)
│   ├── services/        # API configuration
│   ├── stores/          # Zustand state stores
│   └── utils/           # Helper functions
└── ...

nexa-backend/
├── app/
│   ├── models/          # Database models
│   ├── routers/         # API endpoints
│   ├── schemas/         # Pydantic schemas
│   └── main.py          # Entry point
└── ...
```

## 🤝 Contributing
1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
