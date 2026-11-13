# Arise Architecture

## Overview

Arise uses a **WebRTC Mesh** topology for voice/video calls with Socket.IO for signaling.

## Components

```
Client (React)
  ├── Socket.IO client  ← Signaling
  ├── RTCPeerConnection ← Media (WebRTC)
  └── Redux Store       ← State
      
Server (Node.js)
  ├── Socket.IO server  ← Room management
  ├── MongoDB           ← Persistence
  └── Express REST API  ← Auth & data
```

## Data Flow

1. User joins voice channel → emits `join-voice`
2. Server broadcasts to room → all peers create RTCPeerConnection
3. ICE candidates exchanged via Socket.IO
4. Media streams established peer-to-peer
