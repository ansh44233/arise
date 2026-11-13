const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 10000,
    pingInterval: 5000,
    transports: ['websocket', 'polling'],
  });

  // socket.id -> { userId, username, avatarUrl }
  const connectedUsers = new Map();
  // userId -> socket.id
  const userSocketMap = new Map();

  // channelId -> Map<socket.id, { userId, username, avatarUrl, socketId }>
  const voiceChannelUsers = new Map();

  function broadcastOnlineUsers() {
    const onlineList = Array.from(connectedUsers.values());
    io.emit('online-users-update', onlineList);
  }

  function broadcastVoiceUsers(channelId) {
    const usersMap = voiceChannelUsers.get(channelId);
    const users = usersMap ? Array.from(usersMap.values()) : [];
    io.emit('voice-users-update', { channelId, users });
  }

  io.on('connection', (socket) => {
    console.log('✅ Connected:', socket.id);

    // ── ONLINE PRESENCE ──────────────────────────────
    socket.on('user-online', (userData) => {
      if (!userData?.userId) return;

      // Single-session override: disconnect older session if same user connects in new tab/device
      const existingSocketId = userSocketMap.get(userData.userId);
      if (existingSocketId && existingSocketId !== socket.id) {
        const oldSock = io.sockets.sockets.get(existingSocketId);
        if (oldSock) {
          oldSock.emit('session-override', { message: 'You have been logged in from another tab or device.' });
          oldSock.disconnect(true);
        }
      }

      connectedUsers.set(socket.id, { ...userData, socketId: socket.id });
      userSocketMap.set(userData.userId, socket.id);
      broadcastOnlineUsers();
      // Sync current active voice channels for newly connected user
      voiceChannelUsers.forEach((_, cId) => {
        broadcastVoiceUsers(cId);
      });
    });

    // ── TEXT CHANNEL ROOMS ────────────────────────────
    socket.on('join-channel', (channelId) => {
      socket.join(channelId);
    });

    socket.on('leave-channel', (channelId) => {
      socket.leave(channelId);
    });

    socket.on('send-message', ({ channelId, message }) => {
      if (channelId && message) {
        io.to(channelId).emit('new-message', message);
      }
    });

    // ── DIRECT MESSAGES ───────────────────────────────
    socket.on('send-dm', ({ conversationId, message, targetUserId }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      // Echo to sender too (so their own tab updates)
      socket.emit('new-dm', { conversationId, message });
      if (targetSocketId && targetSocketId !== socket.id) {
        io.to(targetSocketId).emit('new-dm', { conversationId, message });
      }
    });

    socket.on('profile-updated', ({ user }) => {
      socket.broadcast.emit('profile-updated', { user });
    });

    // ── VOICE CHANNEL (multi-user WebRTC mesh) ────────
    socket.on('voice-join', ({ channelId, channelName, serverName, userId, username, avatarUrl }) => {
      if (!userId) return;
      const key = (serverName && channelName) ? `${serverName.toLowerCase()}:${channelName.toLowerCase()}` : channelId;
      if (!key) return;

      // Remove from any existing voice channel
      voiceChannelUsers.forEach((map, cId) => {
        if (map.has(socket.id)) {
          map.delete(socket.id);
          broadcastVoiceUsers(cId);
          map.forEach((peer) => {
            const peerSocket = io.sockets.sockets.get(peer.socketId);
            if (peerSocket) peerSocket.emit('voice-peer-left', { socketId: socket.id });
          });
        }
      });

      if (!voiceChannelUsers.has(key)) {
        voiceChannelUsers.set(key, new Map());
      }
      const channelMap = voiceChannelUsers.get(key);

      // Add to channel map FIRST
      channelMap.set(socket.id, { socketId: socket.id, userId, username, avatarUrl, channelId: key });
      socket.join(`voice:${key}`);

      // Tell existing peers about new joiner and vice-versa
      channelMap.forEach((peer) => {
        if (peer.socketId !== socket.id) {
          const peerSock = io.sockets.sockets.get(peer.socketId);
          if (peerSock) {
            peerSock.emit('voice-new-peer', {
              socketId: socket.id,
              userId,
              username,
              avatarUrl,
            });
            socket.emit('voice-existing-peer', {
              socketId: peer.socketId,
              userId: peer.userId,
              username: peer.username,
              avatarUrl: peer.avatarUrl,
            });
          }
        }
      });

      broadcastVoiceUsers(key);
    });

    socket.on('voice-leave', (data) => {
      const channelId = typeof data === 'string' ? data : data?.channelId;
      const channelName = data?.channelName;
      const serverName = data?.serverName;
      const key = (serverName && channelName) ? `${serverName.toLowerCase()}:${channelName.toLowerCase()}` : channelId;
      if (!key) return;
      const map = voiceChannelUsers.get(key);
      if (map) {
        map.delete(socket.id);
        broadcastVoiceUsers(key);
        map.forEach((peer) => {
          const peerSock = io.sockets.sockets.get(peer.socketId);
          if (peerSock) peerSock.emit('voice-peer-left', { socketId: socket.id });
        });
      }
      socket.leave(`voice:${key}`);
    });

    // ── WebRTC SIGNALING (voice channel & screenshare) ─────
    socket.on('screenshare-start', ({ channelId, username, userId }) => {
      socket.broadcast.emit('screenshare-started', { socketId: socket.id, username, userId, channelId });
    });

    socket.on('screenshare-stop', ({ channelId }) => {
      socket.broadcast.emit('screenshare-stopped', { socketId: socket.id, channelId });
    });

    // Relay offer/answer/ice-candidate between specific sockets
    socket.on('webrtc-signal', ({ to, signal, fromUserId, fromUsername }) => {
      const targetSock = io.sockets.sockets.get(to);
      if (targetSock) {
        targetSock.emit('webrtc-signal', {
          from: socket.id,
          fromUserId,
          fromUsername,
          signal,
        });
      }
    });

    // ── 1-on-1 DM CALL SIGNALING ──────────────────────
    socket.on('dm-call-offer', ({ targetUserId, offer, callerName, callType }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('dm-incoming-call', {
          fromSocketId: socket.id,
          fromUserId: connectedUsers.get(socket.id)?.userId,
          fromUsername: callerName,
          offer,
          callType,
        });
      }
    });

    socket.on('dm-call-answer', ({ toSocketId, toUserId, answer }) => {
      let targetSock = toSocketId ? io.sockets.sockets.get(toSocketId) : null;
      if (!targetSock && toUserId) {
        const altSocketId = userSocketMap.get(toUserId);
        if (altSocketId) targetSock = io.sockets.sockets.get(altSocketId);
      }
      if (targetSock) {
        targetSock.emit('dm-call-answered', { answer, fromSocketId: socket.id });
      }
    });

    socket.on('dm-call-ice', ({ toSocketId, toUserId, candidate }) => {
      let targetSock = toSocketId ? io.sockets.sockets.get(toSocketId) : null;
      if (!targetSock && toUserId) {
        const altSocketId = userSocketMap.get(toUserId);
        if (altSocketId) targetSock = io.sockets.sockets.get(altSocketId);
      }
      if (targetSock) {
        targetSock.emit('dm-call-ice', { candidate, fromSocketId: socket.id });
      }
    });

    socket.on('dm-call-reject', ({ toSocketId, toUserId }) => {
      let targetSock = toSocketId ? io.sockets.sockets.get(toSocketId) : null;
      if (!targetSock && toUserId) {
        const altSocketId = userSocketMap.get(toUserId);
        if (altSocketId) targetSock = io.sockets.sockets.get(altSocketId);
      }
      if (targetSock) targetSock.emit('dm-call-rejected');
    });

    socket.on('dm-call-end', ({ toSocketId, toUserId }) => {
      let targetSock = toSocketId ? io.sockets.sockets.get(toSocketId) : null;
      if (!targetSock && toUserId) {
        const altSocketId = userSocketMap.get(toUserId);
        if (altSocketId) targetSock = io.sockets.sockets.get(altSocketId);
      }
      if (targetSock) targetSock.emit('dm-call-ended');
    });


    // ── FRIEND REQUEST REAL-TIME EVENTS ─────────────
    socket.on('send-friend-request', ({ targetUserId, friendship }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('friend-request-received', { friendship });
      }
    });

    socket.on('friend-request-action', ({ targetUserId, action }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('friend-request-updated', { action });
      }
    });

    // ── SCREENSHARE ───────────────────────────────────

    socket.on('screenshare-start', ({ channelId }) => {
      socket.to(`voice:${channelId}`).emit('peer-screenshare-start', { socketId: socket.id });
    });

    socket.on('screenshare-stop', ({ channelId }) => {
      socket.to(`voice:${channelId}`).emit('peer-screenshare-stop', { socketId: socket.id });
    });

    // ── TYPING INDICATORS ─────────────────────────────
    socket.on('typing-start', ({ channelId, username }) => {
      socket.to(channelId).emit('user-typing', { username });
    });

    socket.on('typing-stop', ({ channelId }) => {
      socket.to(channelId).emit('user-stop-typing', {});
    });

    // ── DISCONNECT ────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('❌ Disconnected:', socket.id);
      const userData = connectedUsers.get(socket.id);

      if (userData) {
        userSocketMap.delete(userData.userId);
      }
      connectedUsers.delete(socket.id);

      // Clean voice channels
      voiceChannelUsers.forEach((map, cId) => {
        if (map.has(socket.id)) {
          map.delete(socket.id);
          broadcastVoiceUsers(cId);
          map.forEach((peer) => {
            const peerSock = io.sockets.sockets.get(peer.socketId);
            if (peerSock) peerSock.emit('voice-peer-left', { socketId: socket.id });
          });
        }
      });

      broadcastOnlineUsers();
    });
  });

  server.listen(port, () => {
    console.log(`🚀 Arise running on http://${hostname}:${port}`);
  });
});
