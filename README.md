# ◈ NEXUS — Next-Generation Cyber-Thematic Social Mesh Network

[![Code Alpha Internship](https://img.shields.io/badge/Code%20Alpha-Task%202%20Submission-00F2FE?style=for-the-badge&logo=codeforces&logoColor=black)](https://codealpha.tech/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node & Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 📌 Project Overview
**NEXUS** is a full-stack, futuristic, cyber-thematic social media platform developed as part of **Code Alpha Internship — Task 2: Social Media Platform**. Built using modern web standards (**MERN Stack + Socket.io + Cloudinary**), NEXUS reimagines everyday social interactions into an immersive, hyper-connected social network with rich gamification, real-time messaging, and high-performance media delivery.

---

## 🎯 Task 2 Requirements Compliance

| Requirement | Code Alpha Specification | NEXUS Implementation Status | Key Features |
| :--- | :--- | :---: | :--- |
| **User Profiles** | User profiles with identity & info | ✅ **Complete (Advanced)** | Avatar & banner uploads, Bio, Aura Rank, Follower counters, Badges, Tabs (Posts, Clips, Liked, Saved) |
| **Posts & Comments** | Create/view posts & rich comments | ✅ **Complete (Advanced)** | Image/video uploads, Hashtag tagging, Nested reply threads, Comment reactions, Delete/Edit |
| **Like / Follow System**| Follow accounts and like content | ✅ **Complete (Advanced)** | Follow/Unfollow mesh connection, Animated particle likes, Post bookmarks, Live follower count |
| **Frontend** | HTML, CSS, JavaScript | ✅ **Complete** | React 18, Vite, Custom Tailwind CSS Dark Space Theme, Framer Motion animations |
| **Backend** | Django or Express.js | ✅ **Complete** | Express.js REST API with JWT Auth, Multer/Cloudinary media pipeline, Socket.io |
| **Database** | Users, posts, comments, followers | ✅ **Complete** | MongoDB (Mongoose Schemas) for Users, Posts, Comments, Relationships, Messages, Stories, Notifications |

---

## 🌟 Advanced & Bonus Features

Beyond standard social media requirements, NEXUS incorporates full-scale production-ready features:

1. **⚡ Real-Time Comms (Direct Messaging)**
   - 1-on-1 instant messaging powered by **Socket.io**.
   - Real-time online/offline presence indicators and live unread message badges.
2. **🕒 24-Hour Stories (Temporal Transmissions)**
   - Upload temporary 24h stories with auto-expiry.
   - Interactive full-screen Story Viewer with progress bars and navigation.
3. **🎬 Holo Clips (Shorts / Reels Feed)**
   - TikTok/Reels-style vertical video feed with custom video playback.
   - NPC auto-scroll mode, double-tap to like, and engagement overlays.
4. **🏆 Resonance Leaderboard & Gamification**
   - Dynamic user ranking system with **Aura Points** earned through genuine community interactions (creating posts, clips, receiving reactions).
   - Dynamic tier badges: `🌱 Newbie`, `⚡ Rising`, `✨ Glowing`, `🔥 Radiant`, `👑 Legendary`.
5. **🔔 Real-Time Intel & Alerts (Notifications)**
   - Live socket pushes for likes, comments, mentions, and follows.
6. **🔒 Security & Auth**
   - JWT authentication with secure HTTP cookies and bearer tokens.
   - Password hashing with **bcryptjs**, API rate limiting, and **Helmet** security headers.

---

## 🎨 Futuristic Cyberpunk / Glassmorphism UI Design

NEXUS features a tailored neon glassmorphic design system:
- **Holographic Card Tilt:** CSS 3D matrix transform reacting to cursor coordinates on Post Cards.
- **Aura Particle Burst:** Dynamic particle explosion on interactive like events.
- **Cyber-Thematic Lighting:** Deep dark space background (`#08080F`) with cyan (`#00F2FE`), neon purple (`#7C3AED`), and hot pink accents.
- **Glassmorphism:** Frosted backdrop blurs with subtle borders and glowing neon accents.

---

## 🛠 Tech Stack

### Frontend
- **React 18 + Vite** — High-speed modern SPA frontend
- **Tailwind CSS** — Custom cyber design system and responsive layouts
- **Framer Motion** — Smooth fluid animations, drawer slide-ups, and interactive gestures
- **TanStack React Query** — Optimistic caching & seamless data synchronization
- **Zustand** — Global authentication and user state management
- **Socket.io Client** — Low-latency bidirectional real-time communication
- **Lucide Icons** — Clean, modern icon set

### Backend
- **Node.js & Express.js** — Modular RESTful API server
- **MongoDB Atlas & Mongoose** — Cloud NoSQL database with optimized indexing
- **Socket.io** — Real-time event engine for direct messaging and alerts
- **Cloudinary + Multer** — Cloud media storage and image/video optimization
- **JSON Web Tokens (JWT)** — Token-based stateless authentication
- **Bcrypt.js** — Secure password encryption

---

## 📁 Directory Structure

```
nexus-social/
├── backend/
│   ├── server.js               # Main Express & Socket.io server entry
│   ├── config/
│   │   ├── database.js         # MongoDB connection handler
│   │   └── cloudinary.js       # Cloudinary and Multer configuration
│   ├── middleware/
│   │   └── auth.js             # JWT authentication & route protection
│   ├── models/
│   │   ├── User.js             # User model (profiles, aura rank, followers)
│   │   ├── Post.js             # Post model (images, clips, tags, likes)
│   │   ├── Comment.js          # Comment & reply thread schema
│   │   ├── Story.js            # 24h temporal story schema
│   │   ├── Message.js          # Direct message schema
│   │   ├── Conversation.js     # Chat conversation schema
│   │   └── Notification.js     # Real-time notification schema
│   └── routes/
│       ├── auth.js             # User register, login, refresh, me
│       ├── users.js            # Profile updates, follow/unfollow, leaderboard, search
│       ├── posts.js            # Posts feed, clips, likes, bookmarks, upload
│       ├── comments.js         # Commenting and reply endpoints
│       ├── stories.js          # Story upload & feed endpoints
│       └── messages.js         # Chat conversations & DM messaging
│
└── frontend/
    ├── index.html              # HTML5 entry with NEXUS meta tags
    ├── tailwind.config.js       # Custom cyberpunk color tokens
    └── src/
        ├── api/                # Axios configuration & interceptors
        ├── contexts/           # Zustand Auth store, Socket context, Theme
        ├── components/
        │   ├── Navbar.jsx      # Desktop dock sidebar & mobile navigation
        │   ├── PostCard.jsx    # Holographic post card with 3D tilt & interactions
        │   ├── VideoCard.jsx   # Fullscreen clips viewer
        │   ├── CommentSection.jsx # Slide-up comment drawer
        │   ├── CreatePost.jsx  # Multi-media post & clip creation modal
        │   ├── StoriesRail.jsx # 24h active stories carousel
        │   ├── StoryViewer.jsx # Full-screen temporal story viewer
        │   └── AuraParticles.jsx # Dynamic particle burst animation
        └── pages/
            ├── Feed.jsx        # Main Pulse feed (Personalized algorithm)
            ├── Explore.jsx     # Radar Explore & trending tags
            ├── ReelsFeed.jsx   # Holo Clips short-form video stream
            ├── Messages.jsx    # Real-time encrypted Comms (DMs)
            ├── Notifications.jsx # Intel & Alert stream
            ├── Profile.jsx     # Node Identity profile & customize
            ├── Leaderboard.jsx # Resonance Board & top nodes
            ├── Login.jsx       # Cyberpunk terminal login
            └── Register.jsx    # 3-step node onboarding
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account or local MongoDB instance
- [Cloudinary](https://cloudinary.com/) free tier account for media uploads

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/nexus-social.git
cd nexus-social
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nexus-db
JWT_SECRET=your_jwt_super_secret_key_nexus_2026
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_nexus_2026
JWT_REFRESH_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLIENT_URL=http://localhost:5173
```

Start the backend development server:
```bash
npm run dev
```
*(Server will start on `http://localhost:5000`)*

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
*(Application will be available at `http://localhost:5173`)*

---

## 📡 API Reference Overview

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register new user account |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user & issue JWT |
| **Auth** | `GET` | `/api/auth/me` | Fetch active authenticated user |
| **Posts** | `GET` | `/api/posts/feed` | Algorithmic personalized feed |
| **Posts** | `POST` | `/api/posts` | Create new post with media |
| **Posts** | `POST` | `/api/posts/:id/aura` | Like / remove like on post |
| **Posts** | `POST` | `/api/posts/:id/save` | Bookmark post to Saved Vault |
| **Comments** | `GET` | `/api/comments/:postId` | Get comment tree for a post |
| **Comments** | `POST` | `/api/comments/:postId` | Post comment / reply |
| **Users** | `GET` | `/api/users/:username` | Fetch user profile data |
| **Users** | `POST` | `/api/users/:id/follow` | Follow / Unfollow user |
| **Users** | `GET` | `/api/users/leaderboard` | Top nodes ranked by Aura score |
| **Stories** | `GET` | `/api/stories/feed` | Active 24-hour stories |
| **Stories** | `POST` | `/api/stories` | Upload temporal story |
| **Messages**| `GET` | `/api/messages/conversations` | Get user DM conversations |
| **Messages**| `POST` | `/api/messages/:userId` | Send direct message |

---

## 👨‍💻 Developer & Internship Attribution

- **Developer:** Shahmir
- **Program:** Code Alpha Internship Program
- **Task:** Task 2 — Social Media Platform
- **Project Name:** NEXUS Social Network
