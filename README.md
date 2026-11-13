# ⚡ Arise — Real-Time Voice, Video & Community Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Peer--to--Peer-333333?style=for-the-badge&logo=webrtc)](https://webrtc.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

> **Arise** is a high-performance, full-stack real-time collaboration application inspired by Discord. Built with Next.js 16 (App Router), Node.js, WebSockets, and WebRTC Mesh Architecture, it supports low-latency multi-user voice channels, 1-on-1 direct calls, screen sharing, real-time messaging, and server community management.

---

## ✨ Key Features

### 🎙️ Real-Time Voice & WebRTC Stage
- **Multi-User Voice Channels**: Full mesh WebRTC architecture with STUN/TURN failover for peer-to-peer audio transmission.
- **Active Speaker Detection**: Visual green-ring speaking indicators with audio level analysis.
- **Persistent Voice Connection**: Seamlessly browse servers, channels, and DMs without dropping voice connectivity.
- **Mute & Deafen Controls**: Instant hardware track muting and deafening state broadcasts.

### 📹 Video & Screen Sharing
- **1080p 60fps HD Screenshare**: Share desktop screens or specific application windows directly into voice stages or private calls.
- **Live Theater View**: Dedicated theater layout to watch participant screens in real-time.

### 💬 Direct Messaging & Community Servers
- **Real-Time Chat**: Sub-millisecond message delivery via WebSockets (`socket.io`).
- **Server & Channel Architecture**: Create custom servers, text channels, voice stages, and manage member roles.
- **1-on-1 DM Calls**: Direct voice and video calling with audible ringtones and call acceptance states.
- **User Presence**: Live online/offline status updates across all connected clients.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Next.js 16 (Turbopack, App Router), Framer Motion, Lucide Icons |
| **Real-Time Protocols** | Socket.io, WebRTC (RTCPeerConnection + STUN/TURN OpenRelay) |
| **Backend & API** | Node.js custom HTTP + WebSocket Server, Next.js Route Handlers |
| **Database & ORM** | SQLite / Better-SQLite3, Prisma ORM |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt password hashing |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.19.0`
- **npm** or **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/arise.git
   cd arise
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-super-secure-jwt-secret-key"
   PORT=3000
   ```

4. **Initialize database schema:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The application will be live at `http://localhost:3000`.

---

## 📦 Production Deployment

To run in production with both WebSocket and Next.js bundled together:

```bash
npm run build
npm start
```

---

## 🔒 Security & Performance Highlights
- Zero socket reconnection loops on client navigation.
- Efficient memory buffer audio processing for mic testing.
- Client audio levels analyzed via `Web Audio API` (AnalyserNode) locally without backend server load.
- Isolated STUN/TURN ICE candidate gathering with dynamic relay fallback.

---

## 👨‍💻 Author
Engineered with precision for seamless real-time communications.
