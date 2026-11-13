"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Plus, Hash, LogOut, MessageSquare, Users, Mic, MicOff,
  Headphones, Settings, Volume2, Phone, Video, X, UserCheck,
  Check, PhoneOff, Camera, Trash2, Monitor, SmilePlus, Paperclip,
  Reply, CornerUpLeft, PhoneCall, UserPlus, Copy, Link, Menu, Maximize
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import styles from './app.module.css';

/* ─── Types ─────────────────────────────────────────────── */
interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  about?: string | null;
  badges?: string | null;
  customStatus?: string | null;
  pronouns?: string | null;
  accentColor?: string | null;
}
interface Friendship { id: string; senderId: string; receiverId: string; status: string; sender: User; receiver: User; }
interface Server { id: string; name: string; ownerId?: string; channels: Channel[]; inviteCode?: string; }
interface Channel { id: string; name: string; type: string; }
interface Message { id: string; content: string; fileUrl?: string; createdAt: string; user: { id: string; username: string; avatarUrl?: string }; }
interface DirectMessage { id: string; content: string; senderId: string; createdAt: string; sender: User; }
interface OnlineUser { userId: string; username: string; }
interface RemoteVoicePeer { socketId: string; userId: string; username: string; avatarUrl?: string; stream?: MediaStream; }
interface ServerRole { id: string; name: string; color: string; permissions: string; }

/* ─── Badge SVG Icons ─────────────────────────────────────── */
const BadgeIcons: Record<string, React.FC<{ size?: number }>> = {
  OWNER: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="#faa61a" stroke="#faa61a" strokeWidth="1"/>
    </svg>
  ),
  EARLY_SUPPORTER: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#5865f2"/>
    </svg>
  ),
  NITRO: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#f47fff" opacity="0.2"/>
      <path d="M13 2L4.09 12.6A1 1 0 004.83 14H11v8l8.91-10.6A1 1 0 0019.17 10H13V2z" fill="#f47fff"/>
    </svg>
  ),
  ACTIVE_DEV: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#23272a" stroke="#57f287" strokeWidth="1.5"/>
      <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 7l-2 10" stroke="#57f287" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  STAFF: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.4C17.25 22.15 21 17.25 21 12V7l-9-5z" fill="#eb459e" opacity="0.25"/>
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.4C17.25 22.15 21 17.25 21 12V7l-9-5z" stroke="#eb459e" strokeWidth="1.5" fill="none"/>
      <path d="M9 12l2 2 4-4" stroke="#eb459e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  HYPESQUAD: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="none" stroke="#fee75c" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" fill="#fee75c"/>
    </svg>
  ),
};

const BADGE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  OWNER:          { label: 'Server Owner',    color: '#faa61a', bg: 'rgba(250,166,26,0.15)' },
  EARLY_SUPPORTER:{ label: 'Early Supporter', color: '#5865f2', bg: 'rgba(88,101,242,0.15)' },
  NITRO:          { label: 'Nitro',           color: '#f47fff', bg: 'rgba(244,127,255,0.15)' },
  ACTIVE_DEV:     { label: 'Active Dev',      color: '#57f287', bg: 'rgba(87,242,135,0.15)' },
  STAFF:          { label: 'Arise Staff',     color: '#eb459e', bg: 'rgba(235,69,158,0.15)' },
  HYPESQUAD:      { label: 'HypeSquad',       color: '#fee75c', bg: 'rgba(254,231,92,0.15)'  },
};


/* ─── Emoji sets ─────────────────────────────────────────── */
const EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤔','😭','😤','🥳','🎉','🔥','💯','❤️','👍','👎',
  '🙏','💪','😊','😴','🤯','👋','🤝','🎮','🎵','🍕','🚀','💀','👀','😏','🥺','😈',
  '💜','💙','💚','💛','🧡','🤍','🤎','🖤','❣️','💔','✨','⚡','🌊','🎯','🏆','👑',
];

const STICKERS = ['🐶','🐱','🐭','🐹','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐧','🐦','🦆','🦅',
  '🦋','🐌','🦗','🦂','🐢','🦎','🐍','🐲','🦕','🦖','🦦','🦥','🦨','🦡','🦦'];

let socket: Socket | null = null;

function playNotificationSound(type: 'message' | 'mention' = 'message') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    if (type === 'mention') {
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
    } else {
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {}
}

function AriseStartupScreen() {
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const LOADING_QUOTES = [
    "Waking up Arise server nodes...",
    "Connecting quantum voice pipelines...",
    "Calibrating 512kbps HD audio engine...",
    "Preparing 1080p 60fps screen share...",
    "Entering sanctuary..."
  ];

  useEffect(() => {
    const textInterval = setInterval(() => {
      setLoadingTextIndex(i => (i + 1) % LOADING_QUOTES.length);
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return p + Math.floor(Math.random() * 18) + 6;
      });
    }, 100);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#090a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Ambient background glow spheres */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.12) 50%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1.25, 1, 1.25], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Logo Container */}
      <motion.div
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Animated Cyber Pulsing Crest */}
        <div style={{ position: 'relative' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #6366f1)',
              padding: 2,
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              filter: 'drop-shadow(0 0 16px rgba(99, 102, 241, 0.7))',
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 45px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(255,255,255,0.25)',
              overflow: 'hidden',
            }}
          >
            <img
              src="/logo.png"
              alt="Arise Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          </motion.div>
        </div>

        {/* Brand Name */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '2.2rem',
            letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
          }}>ARISE</h1>
          <p style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginTop: 4,
            fontWeight: 600
          }}>Next-Gen Sanctuary</p>
        </div>

        {/* Glowing Progress Bar */}
        <div style={{
          width: 240,
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <motion.div
            style={{
              height: '100%',
              width: `${Math.min(progress, 100)}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              borderRadius: 10,
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.8)',
              transition: 'width 0.12s ease-out',
            }}
          />
        </div>

        {/* Dynamic Rotating Quotes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={loadingTextIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.22 }}
            style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              height: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#57f287', boxShadow: '0 0 8px #57f287' }} />
            {LOADING_QUOTES[loadingTextIndex]}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function AppPage() {
  const router = useRouter();
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  
  // Dynamic WebRTC ICE/TURN servers
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turns:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ]);

  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [friends, setFriends] = useState<User[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Voice & Video device settings & mic test
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [micTestState, setMicTestState] = useState<'idle' | 'recording' | 'playing'>('idle');
  const [micTestVolume, setMicTestVolume] = useState(0);

  const [addFriendInput, setAddFriendInput] = useState('');
  const [friendStatusMsg, setFriendStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const [activeDmUser, setActiveDmUser] = useState<User | null>(null);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [dmConversations, setDmConversations] = useState<any[]>([]);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [newDmMessage, setNewDmMessage] = useState('');

  const fetchDmConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/dms', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDmConversations(data);
      }
    } catch {}
  }, [token]);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [serverMembers, setServerMembers] = useState<User[]>([]);

  // Voice channel state
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [voiceChannelUsersMap, setVoiceChannelUsersMap] = useState<Record<string, { userId: string; username: string; avatarUrl?: string; socketId?: string }[]>>({});
  const [remoteVoicePeers, setRemoteVoicePeers] = useState<Map<string, RemoteVoicePeer>>(new Map());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set()); // socketIds
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeStreams, setActiveStreams] = useState<Map<string, { socketId: string; userId: string; username: string; stream: MediaStream }>>(new Map());
  const [watchingStreamSocketId, setWatchingStreamSocketId] = useState<string | null>(null);

  // WebRTC refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenshareStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingVoiceIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const speakingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map());
  const createPeerConnectionRef = useRef<(peerId: string, peerUserId: string, peerUsername: string, peerAvatarUrl?: string) => RTCPeerConnection>(null as any);

  // DM call state
  const [activeCall, setActiveCall] = useState<{ targetUser: User; type: 'voice' | 'video'; peerSocketId?: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ fromSocketId: string; fromUserId: string; fromUsername: string; type: 'voice' | 'video'; offer: RTCSessionDescriptionInit } | null>(null);
  const [callMicMuted, setCallMicMuted] = useState(false);
  const [callCamOff, setCallCamOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'reconnecting' | 'failed'>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [callAudioLevel, setCallAudioLevel] = useState(0);
  const callPcRef = useRef<RTCPeerConnection | null>(null);
  const callPeerSocketIdRef = useRef<string | null>(null);
  const pendingCallIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingDmRemoteIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callLocalStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callRemoteAudioRef = useRef<HTMLAudioElement>(null);
  const callAudioAnalyserRef = useRef<AnalyserNode | null>(null);
  const callAudioCtxRef = useRef<AudioContext | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callAudioAnimRef = useRef<number | null>(null);

  const ringtoneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) clearInterval(ringtoneIntervalRef.current);
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = () => {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      };

      playTone();
      ringtoneIntervalRef.current = setInterval(playTone, 2500);
    } catch { /* ignore */ }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  // Global mobile/desktop audio unlock for strict autoplay policies & typing
  useEffect(() => {
    const unlockAudio = () => {
      audioContextsRef.current.forEach(ctx => {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      });
      if (callAudioCtxRef.current && callAudioCtxRef.current.state === 'suspended') {
        callAudioCtxRef.current.resume().catch(() => {});
      }
      document.querySelectorAll('audio').forEach(audio => {
        if (audio.paused) audio.play().catch(() => {});
      });
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  /* ─── Emoji / file ───────────────────────────────────────── */
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<'msg' | 'dm'>('msg');
  const [reactionTargetMsgId, setReactionTargetMsgId] = useState<string | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dmFileInputRef = useRef<HTMLInputElement>(null);
  const [showMsgEmoji, setShowMsgEmoji] = useState(false);
  const [showDmEmoji, setShowDmEmoji] = useState(false);
  const msgInputRef = useRef<HTMLInputElement>(null);
  const dmInputRef = useRef<HTMLInputElement>(null);

  // Profile
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editBadges, setEditBadges] = useState<string[]>(['EARLY_SUPPORTER']);
  const [editCustomStatus, setEditCustomStatus] = useState('');
  const [editPronouns, setEditPronouns] = useState('');
  const [editAccentColor, setEditAccentColor] = useState('#6366f1');
  const [profileSaveMsg, setProfileSaveMsg] = useState('');

  // UI Modals
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [addServerTab, setAddServerTab] = useState<'create' | 'join'>('create');
  const [joinInviteInput, setJoinInviteInput] = useState('');
  const [joinServerError, setJoinServerError] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('TEXT');
  const [showMembers, setShowMembers] = useState(true);
  const [isHome, setIsHome] = useState(true);
  const [friendsTab, setFriendsTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('account');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMembersOpen, setMobileMembersOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);

  /* ─── Auth check ─────────────────────────────────────────── */
  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!t || !u) { router.push('/login'); return; }
    setToken(t);
    const pu = JSON.parse(u);
    setUser(pu);
    setEditAvatarUrl(pu.avatarUrl || '');
    setEditBannerUrl(pu.bannerUrl || '');
    setEditAbout(pu.about || '');
    setEditBadges(pu.badges ? pu.badges.split(',').filter(Boolean) : ['EARLY_SUPPORTER']);
    setEditCustomStatus(pu.customStatus || '');
    setEditPronouns(pu.pronouns || '');
    setEditAccentColor(pu.accentColor || '#6366f1');


    // Fetch dynamic WebRTC ICE/TURN credentials
    fetch('/api/webrtc/ice')
      .then(r => r.json())
      .then(data => {
        if (data.iceServers) {
          iceServersRef.current = data.iceServers;
        }
      })
      .catch(err => console.error('Failed to load dynamic WebRTC config:', err));
  }, [router]);

  /* ─── WebRTC helpers ─────────────────────────────────────── */
  const setupSpeakingDetection = useCallback((peerId: string, stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      audioContextsRef.current.set(peerId, audioCtx);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let running = true;
      let isSpeaking = false;
      let stopTimer: ReturnType<typeof setTimeout> | null = null;

      const check = () => {
        if (!running) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;

        if (avg > 18) {
          if (!isSpeaking) {
            isSpeaking = true;
            setSpeakingUsers(prev => new Set(prev).add(peerId));
          }
          if (stopTimer) clearTimeout(stopTimer);
          stopTimer = setTimeout(() => {
            isSpeaking = false;
            setSpeakingUsers(prev => {
              const n = new Set(prev);
              n.delete(peerId);
              return n;
            });
          }, 500);
        }
        if (running) setTimeout(check, 100);
      };
      check();
      return () => { running = false; if (stopTimer) clearTimeout(stopTimer); audioCtx.close(); };
    } catch { /* ignore */ }
  }, []);

  const createPeerConnection = useCallback((peerId: string, peerUserId: string, peerUsername: string, peerAvatarUrl?: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 10 });

    localStreamRef.current?.getTracks().forEach(track => {
      const sender = pc.addTrack(track, localStreamRef.current!);
      if (track.kind === 'audio') {
        try {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = 64000; // 64kbps HD Voice
          sender.setParameters(params).catch(() => {});
        } catch {}
      }
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket && user) {
        socket.emit('webrtc-signal', { to: peerId, fromUserId: user.id, fromUsername: user.username, signal: { type: 'ice', candidate: e.candidate } });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);

      if (e.track.kind === 'video') {
        setActiveStreams(prev => {
          const next = new Map(prev);
          next.set(peerId, { socketId: peerId, userId: peerUserId, username: peerUsername, stream });
          return next;
        });
        setWatchingStreamSocketId(peerId);
      } else {
        let audioEl = document.getElementById(`audio-${peerId}`) as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = `audio-${peerId}`;
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = stream;
        audioEl.play().catch(() => {});

        setRemoteVoicePeers(prev => {
          const next = new Map(prev);
          const existing = next.get(peerId) || { socketId: peerId, userId: peerUserId, username: peerUsername, avatarUrl: peerAvatarUrl };
          next.set(peerId, { ...existing, stream });
          return next;
        });
        setupSpeakingDetection(peerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peerConnectionsRef.current.delete(peerId);
        pendingVoiceIceCandidatesRef.current.delete(peerId);
      }
    };

    return pc;
  }, [user, setupSpeakingDetection]);

  createPeerConnectionRef.current = createPeerConnection;

  /* ─── Socket + WebRTC events ─────────────────────────────── */
  useEffect(() => {
    if (!token || !user) return;
    socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      socket?.emit('user-online', { userId: user.id, username: user.username, avatarUrl: user.avatarUrl });
      if (activeVoiceChannelId) {
        socket?.emit('voice-join', { channelId: activeVoiceChannelId, userId: user.id, username: user.username, avatarUrl: user.avatarUrl });
      }
    });

    socket.on('session-override', (data: { message: string }) => {
      alert('🔒 ' + (data.message || 'You have been logged in from another tab or device.'));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    });

    socket.on('online-users-update', (list: OnlineUser[]) => setOnlineUsers(list));

    socket.on('voice-users-update', (data: { channelId: string; users: { userId: string; username: string; avatarUrl?: string; socketId?: string }[] }) => {
      setVoiceChannelUsersMap(prev => ({ ...prev, [data.channelId]: data.users }));
    });

    socket.on('screenshare-started', () => {
      // Real-time screenshare notification
    });

    socket.on('screenshare-stopped', (data: { socketId: string }) => {
      setActiveStreams(prev => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
      setWatchingStreamSocketId(cur => cur === data.socketId ? null : cur);
    });


    socket.on('new-message', (message: Message) => {
      setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
      const msgUserId = message.user?.id || (message as unknown as { userId?: string }).userId;
      if (user && msgUserId !== user.id && notificationsEnabled) {
        const isMention = Boolean(user.username && message.content?.toLowerCase().includes(`@${user.username.toLowerCase()}`));
        playNotificationSound(isMention ? 'mention' : 'message');
      }
    });

    socket.on('new-dm', (data: { conversationId: string; message: DirectMessage }) => {
      setDmConversationId(cur => {
        if (cur && data.conversationId === cur) {
          setDmMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]);
        }
        return cur;
      });
      if (user && data.message.senderId !== user.id && notificationsEnabled) {
        playNotificationSound('mention');
      }
    });

    socket.on('profile-updated', ({ user: updated }: { user: User }) => {
      if (user?.id === updated.id) setUser(updated);
      setServerMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      setFriends(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } : f));
      setOnlineUsers(prev => prev.map(o => o.userId === updated.id ? { ...o, avatarUrl: updated.avatarUrl } : o));
      setSelectedUserForProfile(cur => cur?.id === updated.id ? { ...cur, ...updated } : cur);
      setActiveDmUser(cur => cur?.id === updated.id ? { ...cur, ...updated } : cur);
    });

    // ── Voice WebRTC ──────────────────────────────────────────
    socket.on('voice-new-peer', async ({ socketId, userId, username, avatarUrl }: { socketId: string; userId: string; username: string; avatarUrl?: string }) => {
      if (!user) return;
      const pc = createPeerConnectionRef.current(socketId, userId, username, avatarUrl);
      peerConnectionsRef.current.set(socketId, pc);
      setRemoteVoicePeers(prev => { const n = new Map(prev); n.set(socketId, { socketId, userId, username, avatarUrl }); return n; });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('webrtc-signal', { to: socketId, fromUserId: user.id, fromUsername: user.username, signal: { type: 'offer', sdp: offer } });
    });

    socket.on('voice-existing-peer', ({ socketId, userId, username, avatarUrl }: { socketId: string; userId: string; username: string; avatarUrl?: string }) => {
      setRemoteVoicePeers(prev => { const n = new Map(prev); n.set(socketId, { socketId, userId, username, avatarUrl }); return n; });
    });

    socket.on('webrtc-signal', async ({ from, fromUserId, fromUsername, signal }: { from: string; fromUserId: string; fromUsername: string; signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
      if (!user) return;
      if (signal.type === 'offer' && signal.sdp) {
        let pc = peerConnectionsRef.current.get(from);
        if (!pc) { pc = createPeerConnectionRef.current(from, fromUserId, fromUsername); peerConnectionsRef.current.set(from, pc); }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit('webrtc-signal', { to: from, fromUserId: user.id, fromUsername: user.username, signal: { type: 'answer', sdp: answer } });
        // Drain pending ICE candidates
        const pending = pendingVoiceIceCandidatesRef.current.get(from);
        if (pending) {
          for (const cand of pending) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { /* ignore */ }
          }
          pendingVoiceIceCandidatesRef.current.delete(from);
        }
      } else if (signal.type === 'answer' && signal.sdp) {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          // Drain pending ICE candidates
          const pending = pendingVoiceIceCandidatesRef.current.get(from);
          if (pending) {
            for (const cand of pending) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { /* ignore */ }
            }
            pendingVoiceIceCandidatesRef.current.delete(from);
          }
        }
      } else if (signal.type === 'ice' && signal.candidate) {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* ignore */ }
        } else {
          // Queue candidate until remote description is set
          const q = pendingVoiceIceCandidatesRef.current.get(from) || [];
          q.push(signal.candidate);
          pendingVoiceIceCandidatesRef.current.set(from, q);
        }
      }
    });

    socket.on('voice-peer-left', ({ socketId }: { socketId: string }) => {
      peerConnectionsRef.current.get(socketId)?.close();
      peerConnectionsRef.current.delete(socketId);
      pendingVoiceIceCandidatesRef.current.delete(socketId);
      document.getElementById(`audio-${socketId}`)?.remove();
      audioContextsRef.current.get(socketId)?.close();
      audioContextsRef.current.delete(socketId);
      setRemoteVoicePeers(prev => { const n = new Map(prev); n.delete(socketId); return n; });
      setSpeakingUsers(prev => { const n = new Set(prev); n.delete(socketId); return n; });
    });

    // ── DM Call signaling ─────────────────────────────────────
    socket.on('dm-incoming-call', (data: { fromSocketId: string; fromUserId: string; fromUsername: string; offer: RTCSessionDescriptionInit; callType: 'voice' | 'video' }) => {
      setIncomingCall({ fromSocketId: data.fromSocketId, fromUserId: data.fromUserId, fromUsername: data.fromUsername, offer: data.offer, type: data.callType });
      startRingtone();
    });

    socket.on('dm-call-answered', async ({ answer, fromSocketId }: { answer: RTCSessionDescriptionInit; fromSocketId?: string }) => {
      if (fromSocketId) {
        callPeerSocketIdRef.current = fromSocketId;
        setActiveCall(prev => prev ? { ...prev, peerSocketId: fromSocketId } : null);
        if (pendingCallIceCandidatesRef.current.length > 0) {
          pendingCallIceCandidatesRef.current.forEach(cand => {
            socket?.emit('dm-call-ice', { toSocketId: fromSocketId, candidate: cand });
          });
          pendingCallIceCandidatesRef.current = [];
        }
      }
      if (callPcRef.current) {
        await callPcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('connected');
        // Drain pending remote candidates
        if (pendingDmRemoteIceCandidatesRef.current.length > 0) {
          for (const cand of pendingDmRemoteIceCandidatesRef.current) {
            try { await callPcRef.current.addIceCandidate(new RTCIceCandidate(cand)); } catch { /* ignore */ }
          }
          pendingDmRemoteIceCandidatesRef.current = [];
        }
      }
    });

    socket.on('dm-call-ice', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (callPcRef.current && callPcRef.current.remoteDescription) {
        try { await callPcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
      } else {
        pendingDmRemoteIceCandidatesRef.current.push(candidate);
      }
    });

    socket.on('dm-call-rejected', () => { stopRingtone(); endCall(); alert('Call was declined.'); });
    socket.on('dm-call-ended', () => { stopRingtone(); endCall(); });

    return () => { socket?.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);


  /* ─── Data fetching ─────────────────────────────────────── */
  const fetchServers = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/servers', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }
    if (res.ok) setServers(await res.json());
  }, [token, router]);

  const fetchFriends = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }
    if (res.ok) {
      const d = await res.json();
      setFriends(d.friends || []);
      setPendingReceived(d.pendingReceived || []);
      setPendingSent(d.pendingSent || []);
    }
  }, [token, router]);


  const fetchServerMembers = useCallback(async (serverId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/servers/${serverId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setServerMembers(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { if (token) { fetchServers(); fetchFriends(); fetchDmConversations(); } }, [token, fetchServers, fetchFriends, fetchDmConversations]);

  useEffect(() => {
    if (!activeServer || !token) return;
    fetch(`/api/servers/${activeServer.id}/channels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        setChannels(data);
        if (!activeChannel) {
          const tc = data.find((c: Channel) => c.type === 'TEXT');
          if (tc) setActiveChannel(tc);
        }
      });
    fetchServerMembers(activeServer.id);
  }, [activeServer, token, fetchServerMembers]);

  useEffect(() => {
    if (!activeChannel || !token || activeChannel.type !== 'TEXT') return;
    setMessages([]);
    fetch(`/api/channels/${activeChannel.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setMessages(Array.isArray(data) ? data : []));
    socket?.emit('join-channel', activeChannel.id);
    return () => { socket?.emit('leave-channel', activeChannel.id); };
  }, [activeChannel, token]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dmMessages]);

  /* ─── Voice Channel ─────────────────────────────────────── */
  const joinVoiceChannel = async (channel: Channel) => {
    if (!user || !socket) return;
    if (activeVoiceChannelId === channel.id) {
      setActiveChannel(channel);
      setIsHome(false);
      return;
    }
    if (activeVoiceChannelId) await leaveVoiceChannel();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          channelCount: { ideal: 1 },
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
        },
        video: false,
      });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });

      // Setup local speaking detection
      setupSpeakingDetection('local', stream);

      setActiveVoiceChannelId(channel.id);
      setActiveChannel(channel);
      setIsHome(false);

      socket.emit('voice-join', {
        channelId: channel.id,
        channelName: channel.name,
        serverName: activeServer?.name || 'Arise Main',
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        alert('🎤 Microphone access denied! Please allow microphone in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('🎤 No microphone found! Please connect a microphone and try again.');
      } else {
        alert('Could not access microphone: ' + error.message);
      }
    }
  };

  const leaveVoiceChannel = async () => {
    if (!activeVoiceChannelId || !socket) return;
    socket.emit('voice-leave', {
      channelId: activeVoiceChannelId,
      channelName: channels.find(c => c.id === activeVoiceChannelId)?.name,
      serverName: activeServer?.name || 'Arise Main',
    });

    // Stop local stream
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Stop screenshare
    screenshareStreamRef.current?.getTracks().forEach(t => t.stop());
    screenshareStreamRef.current = null;
    setIsScreenSharing(false);

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Remove audio elements
    remoteVoicePeers.forEach((_, sid) => {
      document.getElementById(`audio-${sid}`)?.remove();
      audioContextsRef.current.get(sid)?.close();
    });
    document.getElementById('audio-local')?.remove();
    audioContextsRef.current.forEach(ctx => ctx.close());
    audioContextsRef.current.clear();

    setRemoteVoicePeers(new Map());
    setSpeakingUsers(new Set());
    setActiveVoiceChannelId(null);
    setIsCamOn(false);
  };

  const toggleMic = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !newMuted;
      });
    }

    peerConnectionsRef.current.forEach(pc => {
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !newMuted;
        }
      });
    });

    if (activeVoiceChannelId && socket && user) {
      socket.emit('voice-state-update', {
        channelId: activeVoiceChannelId,
        userId: user.id,
        isMuted: newMuted,
        isDeafened,
      });
    }
  };

  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    const newMuted = newDeafened ? true : isMuted;
    if (newDeafened) setIsMuted(true);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !newMuted;
      });
    }

    peerConnectionsRef.current.forEach(pc => {
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = !newMuted;
        }
      });
    });

    remoteVoicePeers.forEach((_, socketId) => {
      const audioEl = document.getElementById(`audio-${socketId}`) as HTMLAudioElement;
      if (audioEl) {
        audioEl.muted = newDeafened;
      }
    });

    if (activeVoiceChannelId && socket && user) {
      socket.emit('voice-state-update', {
        channelId: activeVoiceChannelId,
        userId: user.id,
        isMuted: newMuted,
        isDeafened: newDeafened,
      });
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenshareStreamRef.current) {
        screenshareStreamRef.current.getTracks().forEach(t => t.stop());
      }
      peerConnectionsRef.current.forEach(async (pc, targetSocketId) => {
        const senders = pc.getSenders().filter(s => s.track && screenshareStreamRef.current?.getTracks().some(st => st.id === s.track?.id));
        senders.forEach(s => pc.removeTrack(s));
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('webrtc-signal', { to: targetSocketId, fromUserId: user?.id, fromUsername: user?.username, signal: { type: 'offer', sdp: offer } });
        } catch {}
      });
      screenshareStreamRef.current = null;
      setIsScreenSharing(false);
      if (activeVoiceChannelId) socket?.emit('screenshare-stop', { channelId: activeVoiceChannelId });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        screenshareStreamRef.current = stream;
        setIsScreenSharing(true);

        peerConnectionsRef.current.forEach(async (pc, targetSocketId) => {
          stream.getTracks().forEach(track => {
            try {
              const sender = pc.addTrack(track, stream);
              const params = sender.getParameters();
              if (!params.encodings) params.encodings = [{}];
              if (track.kind === 'video') params.encodings[0].maxBitrate = 6000000;
              else if (track.kind === 'audio') params.encodings[0].maxBitrate = 512000;
              sender.setParameters(params).catch(() => {});
            } catch {}
          });
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('webrtc-signal', { to: targetSocketId, fromUserId: user?.id, fromUsername: user?.username, signal: { type: 'offer', sdp: offer } });
          } catch {}
        });

        if (activeVoiceChannelId) socket?.emit('screenshare-start', { channelId: activeVoiceChannelId, username: user?.username, userId: user?.id });

        stream.getVideoTracks()[0].onended = () => {
          stream.getTracks().forEach(t => t.stop());
          setIsScreenSharing(false);
          screenshareStreamRef.current = null;
          if (activeVoiceChannelId) socket?.emit('screenshare-stop', { channelId: activeVoiceChannelId });
        };
      } catch { /* user cancelled picker */ }
    }
  };

  /* ─── DM Calls ──────────────────────────────────────────── */
  const startCall = async (targetUser: User, type: 'voice' | 'video') => {
    if (!socket || !user) return;
    try {
      callPeerSocketIdRef.current = null;
      pendingCallIceCandidatesRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      callLocalStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 10 });
      callPcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') setCallStatus('connected');
        else if (state === 'checking') setCallStatus('ringing');
        else if (state === 'disconnected') setCallStatus('reconnecting');
        else if (state === 'failed' || state === 'closed') setCallStatus('failed');
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const peerSockId = callPeerSocketIdRef.current;
          if (peerSockId) {
            socket?.emit('dm-call-ice', { toSocketId: peerSockId, candidate: e.candidate });
          } else {
            pendingCallIceCandidatesRef.current.push(e.candidate);
          }
        }
      };

      pc.ontrack = (e) => {
        const remoteStream = e.streams[0] || new MediaStream([e.track]);
        let audioEl = callRemoteAudioRef.current || (document.getElementById('dm-call-audio') as HTMLAudioElement);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = 'dm-call-audio';
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});
        if (remoteVideoRef.current && e.track.kind === 'video') {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        // Setup audio analyser for remote stream
        try {
          const actx = new AudioContext();
          const src = actx.createMediaStreamSource(remoteStream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          callAudioCtxRef.current = actx;
          callAudioAnalyserRef.current = analyser;
        } catch { /* ignore */ }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('dm-call-offer', {
        targetUserId: targetUser.id,
        offer,
        callerName: user.username,
        callType: type,
      });

      setCallStatus('calling');
      setCallDuration(0);
      setActiveCall({ targetUser, type });
    } catch (err) {
      console.error('Call error:', err);
      alert('Could not access camera/microphone for call.');
    }
  };

  const answerCall = async () => {
    stopRingtone();
    if (!incomingCall || !socket || !user) return;
    try {
      callPeerSocketIdRef.current = incomingCall.fromSocketId;
      pendingCallIceCandidatesRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.type === 'video',
      });
      callLocalStreamRef.current = stream;
      if (localVideoRef.current && incomingCall.type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 10 });
      callPcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') setCallStatus('connected');
        else if (state === 'checking') setCallStatus('ringing');
        else if (state === 'disconnected') setCallStatus('reconnecting');
        else if (state === 'failed' || state === 'closed') setCallStatus('failed');
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const peerSockId = callPeerSocketIdRef.current;
          if (peerSockId) {
            socket?.emit('dm-call-ice', { toSocketId: peerSockId, candidate: e.candidate });
          } else {
            pendingCallIceCandidatesRef.current.push(e.candidate);
          }
        }
      };

      pc.ontrack = (e) => {
        const remoteStream = e.streams[0] || new MediaStream([e.track]);
        let audioEl = callRemoteAudioRef.current || (document.getElementById('dm-call-audio') as HTMLAudioElement);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = 'dm-call-audio';
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});

        if (remoteVideoRef.current && e.track.kind === 'video') {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        // Setup audio analyser for remote stream
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const actx = new AudioContextClass();
            if (actx.state === 'suspended') actx.resume().catch(() => {});
            const src = actx.createMediaStreamSource(remoteStream);
            const analyser = actx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            callAudioCtxRef.current = actx;
            callAudioAnalyserRef.current = analyser;
          }
        } catch { /* ignore */ }
      };


      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('dm-call-answer', { toSocketId: incomingCall.fromSocketId, toUserId: incomingCall.fromUserId, answer });

      const callerUser: User = { id: incomingCall.fromUserId, username: incomingCall.fromUsername, email: '' };
      setCallStatus('connected');
      setCallDuration(0);
      setActiveCall({ targetUser: callerUser, type: incomingCall.type, peerSocketId: incomingCall.fromSocketId });
      setIncomingCall(null);
    } catch (err) {
      console.error('Answer call error:', err);
      alert('Could not access media devices.');
    }
  };

  const rejectCall = () => {
    stopRingtone();
    if (incomingCall && socket) {
      socket.emit('dm-call-reject', { toSocketId: incomingCall.fromSocketId, toUserId: incomingCall.fromUserId });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    stopRingtone();
    if (callPeerSocketIdRef.current && socket) {
      socket.emit('dm-call-end', { toSocketId: callPeerSocketIdRef.current, toUserId: activeCall?.targetUser.id });
    }
    callPcRef.current?.close();
    callPcRef.current = null;
    callPeerSocketIdRef.current = null;
    pendingCallIceCandidatesRef.current = [];
    pendingDmRemoteIceCandidatesRef.current = [];
    callLocalStreamRef.current?.getTracks().forEach(t => t.stop());
    callLocalStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (callRemoteAudioRef.current) callRemoteAudioRef.current.srcObject = null;
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if (callAudioAnimRef.current) { cancelAnimationFrame(callAudioAnimRef.current); callAudioAnimRef.current = null; }
    callAudioCtxRef.current?.close().catch(() => {});
    callAudioCtxRef.current = null;
    callAudioAnalyserRef.current = null;


    setCallDuration(0);
    setCallAudioLevel(0);
    setCallStatus('calling');
    setActiveCall(null);
  };

  // Call duration timer
  useEffect(() => {
    if (activeCall && callStatus === 'connected') {
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [activeCall, callStatus]);

  // Audio level analyser
  useEffect(() => {
    if (!activeCall || callStatus !== 'connected') return;
    const tick = () => {
      if (callAudioAnalyserRef.current) {
        const data = new Uint8Array(callAudioAnalyserRef.current.frequencyBinCount);
        callAudioAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setCallAudioLevel(Math.min(avg / 80, 1)); // normalize 0-1
      }
      callAudioAnimRef.current = requestAnimationFrame(tick);
    };
    callAudioAnimRef.current = requestAnimationFrame(tick);
    return () => { if (callAudioAnimRef.current) cancelAnimationFrame(callAudioAnimRef.current); };
  }, [activeCall, callStatus]);

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ─── Messages ──────────────────────────────────────────── */
  const sendMessage = async (attachedFile?: string) => {
    if ((!newMessage.trim() && !attachedFile) || !activeChannel || !token) return;
    const content = replyTo ? `> @${replyTo.user.username}: ${replyTo.content.slice(0, 60)}\n${newMessage}` : newMessage;
    const res = await fetch(`/api/channels/${activeChannel.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: content || '📎', fileUrl: attachedFile }),
    });
    if (res.ok) {
      const msg = await res.json();
      socket?.emit('send-message', { channelId: activeChannel.id, message: msg });
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setNewMessage('');
      setReplyTo(null);
    }
  };

  const sendDirectMessage = async (attachedFile?: string) => {
    if ((!newDmMessage.trim() && !attachedFile) || !dmConversationId || !activeDmUser || !token) return;
    const res = await fetch('/api/dms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ conversationId: dmConversationId, content: newDmMessage || '📎', fileUrl: attachedFile }),
    });
    if (res.ok) {
      const msg = await res.json();
      socket?.emit('send-dm', { conversationId: dmConversationId, message: msg, targetUserId: activeDmUser.id });
      setDmMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setNewDmMessage('');
    }
  };

  const handleFileAttach = (forDm: boolean) => {
    const input = forDm ? dmFileInputRef.current : fileInputRef.current;
    input?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, forDm: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(url);
        if (forDm) sendDirectMessage(dataUrl);
        else sendMessage(dataUrl);
      };
      img.src = url;
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (forDm) sendDirectMessage(dataUrl);
        else sendMessage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const addReaction = (msgId: string, emoji: string) => {
    if (!user) return;
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const users = [...(msgReactions[emoji] || [])];
      const idx = users.indexOf(user.id);
      if (idx >= 0) users.splice(idx, 1); else users.push(user.id);
      if (users.length === 0) delete msgReactions[emoji]; else msgReactions[emoji] = users;
      return { ...prev, [msgId]: msgReactions };
    });
  };

  const openDirectMessage = async (targetUser: User) => {
    setIsHome(true); setActiveServer(null); setActiveChannel(null); setActiveDmUser(targetUser);
    const res = await fetch(`/api/dms?targetUserId=${targetUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const c = await res.json(); setDmConversationId(c.id); setDmMessages(c.messages || []); }

    // Auto-send friend request if not already friends or pending
    if (user && targetUser.id !== user.id) {
      const isFriend = friends.some(f => f.id === targetUser.id);
      const isPendingSent = pendingSent.some(p => p.receiverId === targetUser.id);
      const isPendingRecv = pendingReceived.some(p => p.senderId === targetUser.id);
      if (!isFriend && !isPendingSent && !isPendingRecv) {
        try {
          const resF = await fetch('/api/friends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId: targetUser.id }),
          });
          if (resF.ok) {
            const dataF = await resF.json();
            fetchFriends();
            if (dataF.targetUser?.id) {
              socket?.emit('send-friend-request', { targetUserId: dataF.targetUser.id, friendship: dataF.friendship });
            }
          }
        } catch {}
      }
    }
  };

  const sendFriendRequest = async () => {
    if (!addFriendInput.trim() || !token) return;
    setFriendStatusMsg(null);
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: addFriendInput.trim() }),
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }
    const data = await res.json();
    if (res.ok) {
      setFriendStatusMsg({ text: `Friend request sent to ${data.targetUser.username}! 🎉` });
      setAddFriendInput('');
      fetchFriends();
      if (data.targetUser?.id) {
        socket?.emit('send-friend-request', { targetUserId: data.targetUser.id, friendship: data.friendship });
      }
    } else {
      setFriendStatusMsg({ text: data.error || 'Failed', error: true });
    }
  };

  const handleFriendRequestAction = async (friendshipId: string, action: 'ACCEPT' | 'REJECT') => {
    const res = await fetch('/api/friends', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ friendshipId, action }),
    });
    if (res.ok) {
      const data = await res.json();
      fetchFriends();
      if (data.otherUserId) {
        socket?.emit('friend-request-action', { targetUserId: data.otherUserId, action });
      }
    }
  };

  const saveProfile = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          avatarUrl: editAvatarUrl,
          bannerUrl: editBannerUrl,
          about: editAbout,
          customStatus: editCustomStatus,
          pronouns: editPronouns,
          accentColor: editAccentColor,
          // badges are auto-computed server-side
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        // Immediately sync new PFP/avatarUrl across socket online and voice channels
        socket?.emit('user-online', { userId: updated.id, username: updated.username, avatarUrl: updated.avatarUrl });
        socket?.emit('profile-updated', { user: updated });
        if (activeVoiceChannelId) {
          socket?.emit('voice-join', {
            channelId: activeVoiceChannelId,
            channelName: channels.find(c => c.id === activeVoiceChannelId)?.name,
            serverName: activeServer?.name || 'Arise Main',
            userId: updated.id,
            username: updated.username,
            avatarUrl: updated.avatarUrl,
          });
        }
        setProfileSaveMsg('Profile updated! ✨');
        setTimeout(() => setProfileSaveMsg(''), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setProfileSaveMsg('Save failed: ' + (err.error || res.status));
        setTimeout(() => setProfileSaveMsg(''), 4000);
      }
    } catch {
      setProfileSaveMsg('Network error. Please try again.');
      setTimeout(() => setProfileSaveMsg(''), 4000);
    }
  };



  const createServer = async () => {
    if (!newServerName.trim() || !token) return;
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newServerName }),
      });
      if (res.ok) {
        const srv = await res.json();
        setServers(prev => [...prev, srv]);
        setActiveServer(srv);
        setIsHome(false);
        setNewServerName('');
        setShowCreateServer(false);
        setAddServerTab('create');
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Failed to create server: ' + (err.error || res.status));
      }
    } catch (e) {
      alert('Network error creating server. Please try again.');
    }
  };


  const joinServerByInvite = async () => {
    if (!joinInviteInput.trim() || !token) return;
    setJoinServerError('');
    try {
      const res = await fetch('/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: joinInviteInput }),
      });
      if (res.ok) {
        const srv = await res.json();
        setServers(prev => prev.some(x => x.id === srv.id) ? prev : [...prev, srv]);
        setActiveServer(srv);
        setIsHome(false);
        setJoinInviteInput('');
        setShowCreateServer(false);
      } else {
        const err = await res.json();
        setJoinServerError(err.error || 'Failed to join server');
      }
    } catch {
      setJoinServerError('Error joining server');
    }
  };

  const joinServerByCode = async (code: string) => {
    const raw = code.trim();
    if (!raw) return;
    // Extract just the code part if a full URL was pasted
    const extracted = raw.includes('/invite/') ? raw.split('/invite/').pop()?.trim() || raw : raw;
    setJoinServerError('');
    try {
      const res = await fetch('/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: extracted }),
      });
      if (res.ok) {
        const srv = await res.json();
        setServers(prev => prev.some(x => x.id === srv.id) ? prev : [...prev, srv]);
        setActiveServer(srv);
        setIsHome(false);
        setJoinInviteInput('');
        setShowCreateServer(false);
        setAddServerTab('create');
      } else {
        const err = await res.json().catch(() => ({}));
        setJoinServerError(err.error || 'Invalid invite code');
      }
    } catch {
      setJoinServerError('Network error. Please try again.');
    }
  };



  const createChannel = async () => {
    if (!newChannelName.trim() || !activeServer || !token) return;
    const res = await fetch(`/api/servers/${activeServer.id}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newChannelName, type: newChannelType }),
    });
    if (res.ok) { const ch = await res.json(); setChannels(prev => [...prev, ch]); setNewChannelName(''); setNewChannelType('TEXT'); setShowCreateChannel(false); }
  };

  const handleLogout = () => { localStorage.clear(); router.push('/login'); };

  const fmt = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const isUserOnline = (userId: string) => onlineUsers.some(u => u.userId === userId);

  if (!user) return null;

  const textChannels = channels.filter(c => c.type === 'TEXT');
  const voiceChannels = channels.filter(c => c.type === 'VOICE');
  const onlineFriends = friends.filter(f => isUserOnline(f.id));

  /* ─── Message Component ─────────────────────────────────── */
  const MessageBubble = ({ msg, isOwn, prevMsg }: { msg: Message | DirectMessage; isOwn: boolean; prevMsg?: Message | DirectMessage }) => {
    const [hovered, setHovered] = useState(false);
    const [showInlineEmoji, setShowInlineEmoji] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
    const msgUser = 'user' in msg ? msg.user : msg.sender;
    const msgId = msg.id;
    const msgReactions = reactions[msgId] || {};
    const isReply = msg.content.startsWith('> @');
    const prevMsgUser = prevMsg ? ('user' in prevMsg ? prevMsg.user : prevMsg.sender) : null;
    const isGrouped = prevMsgUser?.id === msgUser.id &&
      Math.abs(new Date(msg.createdAt).getTime() - new Date(prevMsg!.createdAt).getTime()) < 5 * 60 * 1000;

    const quickReactions = ['❤️','😂','🔥','😢'];
    const closeCtx = () => setShowContextMenu(false);
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setCtxPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };

    return (
      <div
        className={`${styles.messageGroup} ${isGrouped ? styles.messageGrouped : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowInlineEmoji(false); }}
        onContextMenu={handleContextMenu}
        style={{ position: 'relative' }}
      >
        {/* ── Discord hover action bar ── */}
        {hovered && !showContextMenu && (
          <div className={styles.msgHoverBar}>
            {quickReactions.map(e => (
              <button key={e} className={styles.msgHoverEmoji} onClick={() => addReaction(msgId, e)} title={e}>{e}</button>
            ))}
            <div className={styles.msgHoverDivider} />
            <button className={styles.msgHoverBtn} title="Add Reaction" onClick={() => setShowInlineEmoji(v => !v)}>
              <SmilePlus size={16} />
            </button>
            {'user' in msg && (
              <button className={styles.msgHoverBtn} title="Reply" onClick={() => setReplyTo(msg as Message)}>
                <CornerUpLeft size={16} />
              </button>
            )}
            <button className={styles.msgHoverBtn} title="More"
              onClick={(e) => { e.stopPropagation(); setCtxPos({ x: e.clientX, y: e.clientY - 200 }); setShowContextMenu(true); }}>
              <span style={{ fontSize: '1rem', letterSpacing: '0.1em', lineHeight: 1 }}>···</span>
            </button>
          </div>
        )}


        {/* ── Inline emoji picker ── */}
        {showInlineEmoji && (
          <div className={styles.quickEmojiPicker}>
            {EMOJIS.slice(0, 36).map(e => (
              <button key={e} className={styles.quickEmojiBtn}
                onClick={() => { addReaction(msgId, e); setShowInlineEmoji(false); }}>{e}</button>
            ))}
          </div>
        )}

        {/* ── Context menu ── */}
        {showContextMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={closeCtx} />
            <div
              className={styles.contextMenu}
              style={{ position: 'fixed', left: Math.min(ctxPos.x, window.innerWidth - 240), top: Math.min(ctxPos.y, window.innerHeight - 420), zIndex: 1000 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.ctxReactionRow}>
                {quickReactions.map(e => (
                  <button key={e} className={styles.ctxReactionBtn} onClick={() => { addReaction(msgId, e); closeCtx(); }}>{e}</button>
                ))}
                <button className={styles.ctxMoreReactionBtn}
                  onClick={() => { setReactionTargetMsgId(msgId); setShowEmojiPicker(true); closeCtx(); }}>
                  <SmilePlus size={14} />
                </button>
              </div>
              <div className={styles.ctxDivider} />
              {'user' in msg && (
                <button className={styles.ctxItem} onClick={() => { setReplyTo(msg as Message); closeCtx(); }}>
                  <CornerUpLeft size={15} /> Reply
                </button>
              )}
              <button className={styles.ctxItem} onClick={() => { navigator.clipboard?.writeText(msg.content); closeCtx(); }}>
                <span>📋</span> Copy Text
              </button>
              {isOwn && (
                <button className={styles.ctxItem} onClick={() => { setMessages(p => p.filter(m => m.id !== msgId)); closeCtx(); }}>
                  <Trash2 size={15} /> Delete Message
                </button>
              )}
              <div className={styles.ctxDivider} />
              <button className={styles.ctxItem} onClick={() => { navigator.clipboard?.writeText(msgId); closeCtx(); }}>
                <span>🔗</span> Copy Message ID
              </button>
              <button className={`${styles.ctxItem} ${styles.ctxItemDanger}`} onClick={closeCtx}>
                <span>🚩</span> Report Message
              </button>
            </div>
          </>
        )}

        {/* ── Avatar col ── */}
        <div className={styles.messageAvatarCol}>
          {isGrouped ? (
            <span className={styles.messageCompactTime}>{hovered ? fmt(msg.createdAt) : ''}</span>
          ) : (
            <div
              className={styles.messageAvatar}
              style={msgUser.avatarUrl ? { backgroundImage: `url(${msgUser.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              onClick={() => setSelectedUserForProfile({ id: msgUser.id, username: msgUser.username, email: '' })}
            >
              {!msgUser.avatarUrl && msgUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* ── Message body ── */}
        <div className={styles.messageBody}>
          {!isGrouped && (
            <div className={styles.messageHeader}>
              <span
                className={`${styles.messageAuthor} ${isOwn ? styles.messageAuthorSelf : ''}`}
                onClick={() => setSelectedUserForProfile({ id: msgUser.id, username: msgUser.username, email: '' })}
              >
                {msgUser.username}
              </span>
              <span className={styles.messageTimestamp}>{fmtDate(msg.createdAt)} at {fmt(msg.createdAt)}</span>
            </div>
          )}
          {isReply && (
            <div className={styles.replyPreview}>
              <CornerUpLeft size={10} style={{ flexShrink: 0 }} />
              <span className={styles.replyPreviewContent}>
                {msg.content.split('\n')[0].replace('> @', '').slice(0, 100)}
              </span>
            </div>
          )}
          {/* File / Image Attachment */}
          {('fileUrl' in msg && msg.fileUrl) ? (
            msg.fileUrl.startsWith('data:image') ? (
              <img src={msg.fileUrl} alt="attachment" className={styles.msgImage} />
            ) : (
              <a href={msg.fileUrl} download="attachment" className={styles.msgFileLink}>📎 Download file</a>
            )
          ) : msg.content.includes('data:image') ? (
            <img src={msg.content.substring(msg.content.indexOf('data:image'))} alt="attachment" className={styles.msgImage} />
          ) : null}

          {/* Message Text */}
          {(!msg.content.startsWith('data:image')) && (
            <p className={styles.messageText}>
              {isReply ? msg.content.split('\n').slice(1).join('\n') : (msg.content.includes('data:image') ? msg.content.substring(0, msg.content.indexOf('data:image')) : msg.content)}
            </p>
          )}
          {Object.keys(msgReactions).length > 0 && (
            <div className={styles.reactionsRow}>
              {Object.entries(msgReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  className={`${styles.reactionBadge} ${users.includes(user.id) ? styles.reactionBadgeActive : ''}`}
                  onClick={() => addReaction(msgId, emoji)}
                >
                  {emoji} <span>{users.length}</span>
                </button>
              ))}
              <button
                className={styles.reactionBadge}
                onClick={() => { setReactionTargetMsgId(msgId); setShowEmojiPicker(true); }}
                title="Add reaction"
              >
                <SmilePlus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─── Voice Channel View ──────────────────────────────────── */
  const VoiceChannelView = ({ channel }: { channel: Channel }) => {
    const isConnected = activeVoiceChannelId === channel.id;
    const normKey = activeServer?.name ? `${activeServer.name.toLowerCase()}:${channel.name.toLowerCase()}` : channel.id;
    const allChannelUsers = voiceChannelUsersMap[channel.id] || (normKey ? voiceChannelUsersMap[normKey] : undefined) || [];
    const remoteUsersInChannel = allChannelUsers.filter(u => u.userId !== user?.id);
    const peers = Array.from(remoteVoicePeers.values());
    const amSpeaking = speakingUsers.has('local');

    return (
      <div className={styles.voiceChannelView}>
        <div className={styles.voiceChannelHeader}>
          <Volume2 size={18} />
          <span>{channel.name}</span>
          {isConnected && <span className={styles.voiceLiveTag}>LIVE</span>}
        </div>

        {isConnected ? (
          <>
            {/* Active Watch Stream / Screenshare Theater View */}
            {watchingStreamSocketId && activeStreams.has(watchingStreamSocketId) && (
              <div style={{ width: '100%', maxWidth: 900, aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', background: '#000', position: 'relative', marginBottom: 16, border: '2px solid var(--accent)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)' }}>
                <video
                  ref={el => {
                    const item = activeStreams.get(watchingStreamSocketId);
                    if (el && item?.stream) el.srcObject = item.stream;
                  }}
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#ed4245', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 800 }}>LIVE</span>
                  <span>{activeStreams.get(watchingStreamSocketId)?.username}'s Stream (1080p 60fps HD)</span>
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.7)' }}
                    onClick={(e) => {
                      const videoEl = e.currentTarget.parentElement?.parentElement?.querySelector('video');
                      if (videoEl?.requestFullscreen) videoEl.requestFullscreen();
                    }}
                  >
                    <Maximize size={14} /> Fullscreen
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={() => setWatchingStreamSocketId(null)}
                  >
                    <X size={14} /> Stop Watching
                  </button>
                </div>
              </div>
            )}

            {/* Local Screenshare Preview */}
            {isScreenSharing && (
              <div style={{ width: '100%', maxWidth: 900, aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', background: '#000', position: 'relative', marginBottom: 16, border: '2px solid #57f287', boxShadow: '0 8px 32px rgba(87, 242, 135, 0.3)' }}>
                <video
                  ref={el => { if (el && screenshareStreamRef.current) el.srcObject = screenshareStreamRef.current; }}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#57f287', color: '#000', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 800 }}>YOU ARE STREAMING</span>
                  <span>1080p 60fps HD</span>
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={toggleScreenShare}>
                    Stop Sharing
                  </button>
                </div>
              </div>
            )}

            {/* User tiles grid */}
            <div className={styles.voiceTilesGrid}>

              {/* Remote Peer Screenshare Tiles */}
              {peers.map(peer => {
                const hasVideo = peer.stream && peer.stream.getVideoTracks().length > 0;
                if (!hasVideo) return null;
                return (
                  <div key={`screen-${peer.socketId}`} style={{ width: '100%', maxWidth: 720, aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#000', position: 'relative', marginBottom: 12 }}>
                    <video
                      ref={el => { if (el && peer.stream) el.srcObject = peer.stream; }}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', color: '#fff' }}>
                      🖥️ {peer.username}'s Screen
                    </div>
                  </div>
                );
              })}

              {/* Local user tile */}
              <div className={`${styles.voiceTile} ${amSpeaking && !isMuted ? styles.voiceTileSpeaking : ''}`}>
                <div
                  className={styles.voiceTileAvatar}
                  style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {!user.avatarUrl && user.username.charAt(0).toUpperCase()}
                </div>
                <div className={styles.voiceTileName}>{user.username}</div>
                <div className={styles.voiceTileIcons}>
                  {isMuted && <MicOff size={14} style={{ color: '#ed4245' }} />}
                  {isDeafened && <Headphones size={14} style={{ color: '#ed4245' }} />}
                </div>
              </div>

              {/* Remote peer tiles */}
              {remoteUsersInChannel.map(ru => {
                const peer = peers.find(p => p.userId === ru.userId || p.socketId === ru.socketId);
                const isSpeaking = speakingUsers.has(ru.socketId || '') || Boolean(peer && speakingUsers.has(peer.socketId));
                const avatar = ru.avatarUrl || peer?.avatarUrl;
                return (
                  <div key={ru.userId || ru.socketId} className={`${styles.voiceTile} ${isSpeaking ? styles.voiceTileSpeaking : ''}`}>
                    <div
                      className={styles.voiceTileAvatar}
                      style={avatar ? { backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    >
                      {!avatar && ru.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.voiceTileName}>{ru.username}</div>
                    {isSpeaking && <div className={styles.speakingRing} />}
                  </div>
                );
              })}

              {remoteUsersInChannel.length === 0 && !isScreenSharing && (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 16 }}>
                  You're alone in here. Invite friends to join!
                </div>
              )}
            </div>

            {/* Voice controls bar */}
            <div className={styles.voiceControlsBar}>
              <button className={`${styles.voiceCtrlBtn} ${isMuted ? styles.voiceCtrlBtnRed : ''}`} onClick={toggleMic} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                <span>{isMuted ? 'Unmuted' : 'Mute'}</span>
              </button>
              <button className={`${styles.voiceCtrlBtn} ${isDeafened ? styles.voiceCtrlBtnRed : ''}`} onClick={() => setIsDeafened(!isDeafened)} title={isDeafened ? 'Undeafen' : 'Deafen'}>
                <Headphones size={20} />
                <span>Deafen</span>
              </button>
              <button className={`${styles.voiceCtrlBtn} ${isScreenSharing ? styles.voiceCtrlBtnGreen : ''}`} onClick={toggleScreenShare} title="Screenshare">
                <Monitor size={20} />
                <span>Share</span>
              </button>
              <button className={`${styles.voiceCtrlBtn} ${styles.voiceCtrlBtnRed}`} onClick={leaveVoiceChannel} title="Disconnect">
                <PhoneOff size={20} />
                <span>Leave</span>
              </button>
            </div>
          </>
        ) : (
          <div className={styles.voiceJoinPrompt}>
            <div className={styles.voiceJoinIcon}>
              <Volume2 size={40} />
            </div>
            <h3>{channel.name}</h3>
            <p>Click to join this voice channel</p>
            <button className="btn-primary" onClick={() => joinVoiceChannel(channel)}>
              <PhoneCall size={16} style={{ display: 'inline', marginRight: 6 }} />
              Join Voice
            </button>
            {/* Show who's already in channel */}
            {(voiceChannelUsersMap[channel.id] || []).length > 0 && (
              <div className={styles.voiceJoinMembers}>
                {(voiceChannelUsersMap[channel.id] || []).map(vu => (
                  <div key={vu.userId} className={styles.voiceJoinMember}>
                    <div className={styles.voiceJoinMemberAvatar} style={vu.avatarUrl ? { backgroundImage: `url(${vu.avatarUrl})`, backgroundSize: 'cover' } : {}}>
                      {!vu.avatarUrl && vu.username.charAt(0).toUpperCase()}
                    </div>
                    <span>{vu.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ─── Emoji Picker ──────────────────────────────────────── */
  const EmojiPickerPanel = ({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) => {
    const [tab, setTab] = useState<'emoji' | 'sticker'>('emoji');
    return (
      <div className={styles.emojiPicker}>
        <div className={styles.emojiPickerTabs}>
          <button className={`${styles.emojiPickerTab} ${tab === 'emoji' ? styles.emojiPickerTabActive : ''}`} onClick={() => setTab('emoji')}>😀 Emoji</button>
          <button className={`${styles.emojiPickerTab} ${tab === 'sticker' ? styles.emojiPickerTabActive : ''}`} onClick={() => setTab('sticker')}>🐶 Stickers</button>
          <button className={styles.emojiPickerClose} onClick={onClose}><X size={14} /></button>
        </div>
        <div className={styles.emojiGrid}>
          {(tab === 'emoji' ? EMOJIS : STICKERS).map(e => (
            <button key={e} className={styles.emojiBtn} onClick={() => onPick(e)}>{e}</button>
          ))}
        </div>
      </div>
    );
  };

  /* ─── Message Input (inlined to prevent React remounting / focus loss) ─── */

  const handleMsgKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDirectMessage();
    }
  };

  const renderMessageInput = (forDm: boolean) => {
    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (forDm) sendDirectMessage();
      else sendMessage();
    };

    return (
      <form className={styles.inputContainer} onSubmit={handleFormSubmit}>
        {replyTo && !forDm && (
          <div className={styles.replyBar}>
            <CornerUpLeft size={14} />
            <span>Replying to <strong>@{replyTo.user.username}</strong>: {replyTo.content.slice(0, 50)}</span>
            <button type="button" onClick={() => setReplyTo(null)}><X size={14} /></button>
          </div>
        )}
        <div className={styles.inputWrapper}>
          <button type="button" className={styles.inputActionBtn} onClick={() => handleFileAttach(forDm)} title="Attach File">
            <Paperclip size={18} />
          </button>
          <input ref={forDm ? dmFileInputRef : fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => handleFileChange(e, forDm)} />
          <input
            ref={forDm ? dmInputRef : msgInputRef}
            className={styles.messageInput}
            placeholder={forDm ? `Message @${activeDmUser?.username}` : `Message #${activeChannel?.name}`}
            value={forDm ? newDmMessage : newMessage}
            onChange={e => forDm ? setNewDmMessage(e.target.value) : setNewMessage(e.target.value)}
            onKeyDown={forDm ? handleDmKeyDown : handleMsgKeyDown}
            autoComplete="off"
          />
          <div style={{ position: 'relative' }}>
            <button type="button" className={styles.inputActionBtn} onClick={() => forDm ? setShowDmEmoji(!showDmEmoji) : setShowMsgEmoji(!showMsgEmoji)} title="Emoji & Stickers">
              <SmilePlus size={18} />
            </button>
            {(forDm ? showDmEmoji : showMsgEmoji) && (
              <div style={{ position: 'absolute', bottom: '44px', right: 0, zIndex: 200 }}>
                <EmojiPickerPanel
                  onPick={emoji => { forDm ? setNewDmMessage(p => p + emoji) : setNewMessage(p => p + emoji); forDm ? setShowDmEmoji(false) : setShowMsgEmoji(false); }}
                  onClose={() => forDm ? setShowDmEmoji(false) : setShowMsgEmoji(false)}
                />
              </div>
            )}
          </div>
          <button type="submit" className={styles.sendBtn} title="Send Message">
            <Send size={16} />
          </button>
        </div>
      </form>
    );
  };

  /* ─── JSX ────────────────────────────────────────────────── */
  if (!user) {
    return <AriseStartupScreen />;
  }

  return (
    <>
      <AnimatePresence>
        {isAppLoading && <AriseStartupScreen />}
      </AnimatePresence>
      <div className={styles.appLayout}>
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && <div className={styles.mobileBackdrop} onClick={() => setMobileNavOpen(false)} />}
      {mobileMembersOpen && <div className={styles.mobileBackdrop} onClick={() => setMobileMembersOpen(false)} />}

      {/* Mobile Left Drawer Container (Server + Channel Sidebars) */}
      <div className={`${styles.mobileDrawerContainer} ${mobileNavOpen ? styles.mobileDrawerOpen : ''}`}>
      {/* ── SERVER SIDEBAR ── */}
      <div className={styles.serverSidebar}>
        <button className={`${styles.homeBtn} ${isHome ? styles.homeBtnActive : ''}`} onClick={() => { setIsHome(true); setActiveServer(null); setActiveChannel(null); }} title="Direct Messages & Friends">
          <img src="/logo.png" alt="Arise" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
        </button>
        <div className={styles.divider} />
        {servers.map(s => (
          <div key={s.id} style={{ position: 'relative' }}>
            {activeServer?.id === s.id && <div className={styles.serverIndicator} />}
            <button className={`${styles.serverIcon} ${activeServer?.id === s.id ? styles.serverIconActive : ''}`} onClick={() => { setActiveServer(s); setIsHome(false); setActiveDmUser(null); }} title={s.name}>
              {s.name.charAt(0).toUpperCase()}
            </button>
          </div>
        ))}
        <button className={styles.addServerBtn} onClick={() => setShowCreateServer(true)} title="Create Server"><Plus size={20} /></button>
      </div>

      {/* ── CHANNEL / DM SIDEBAR ── */}
      <div className={styles.channelSidebar}>
        {isHome ? (
          <>
            <div className={styles.serverHeader}><span>Direct Messages</span><Users size={16} style={{ color: 'var(--text-muted)' }} /></div>
            <div className={styles.channelList}>
              <div className={`${styles.channelItem} ${!activeDmUser ? styles.channelItemActive : ''}`} onClick={() => { setActiveDmUser(null); setMobileNavOpen(false); }}>
                <Users size={16} className={styles.channelIcon} /> Friends
              </div>
              {/* Direct Messages Conversations */}
              {dmConversations.length > 0 && (
                <div className={styles.channelCategory} style={{ marginTop: 8 }}><span>Direct Messages</span></div>
              )}
              {dmConversations.map(c => {
                const otherUser = c.userOneId === user.id ? c.userTwo : c.userOne;
                if (!otherUser) return null;
                return (
                  <div key={c.id} className={`${styles.dmUserItem} ${activeDmUser?.id === otherUser.id ? styles.channelItemActive : ''}`} onClick={() => { openDirectMessage(otherUser); setMobileNavOpen(false); }}>
                    <div className={styles.dmUserAvatar} style={otherUser.avatarUrl ? { backgroundImage: `url(${otherUser.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                      {!otherUser.avatarUrl && otherUser.username.charAt(0).toUpperCase()}
                      <div className={styles.statusDot} style={{ background: isUserOnline(otherUser.id) ? 'var(--green)' : 'var(--text-muted)' }} />
                    </div>
                    <div className={styles.dmUserName}>{otherUser.username}</div>
                  </div>
                );
              })}

              {friends.length > 0 && <div className={styles.channelCategory} style={{ marginTop: 12 }}><span>Friends ({friends.length})</span></div>}
              {friends.map(f => (
                <div key={f.id} className={`${styles.dmUserItem} ${activeDmUser?.id === f.id ? styles.channelItemActive : ''}`} onClick={() => { openDirectMessage(f); setMobileNavOpen(false); }}>
                  <div className={styles.dmUserAvatar} style={f.avatarUrl ? { backgroundImage: `url(${f.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                    {!f.avatarUrl && f.username.charAt(0).toUpperCase()}
                    <div className={styles.statusDot} style={{ background: isUserOnline(f.id) ? 'var(--green)' : 'var(--text-muted)' }} />
                  </div>
                  <div className={styles.dmUserName}>{f.username}</div>
                </div>
              ))}
            </div>
          </>
        ) : activeServer ? (
          <>
            <div className={styles.serverHeader} onClick={() => setShowServerSettings(true)}>
              <span>{activeServer.name}</span>
              <Settings size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className={styles.channelList}>
              <div className={styles.channelCategory}>
                <span>Text Channels</span>
                <Plus size={14} className={styles.channelCategoryAdd} onClick={() => { setNewChannelType('TEXT'); setShowCreateChannel(true); }} />
              </div>
              {textChannels.map(ch => (
                <div key={ch.id} className={`${styles.channelItem} ${activeChannel?.id === ch.id && !activeVoiceChannelId ? styles.channelItemActive : ''}`} onClick={() => { setActiveChannel(ch); setMobileNavOpen(false); }}>
                  <Hash size={16} className={styles.channelIcon} /> {ch.name}
                </div>
              ))}
              <div className={styles.channelCategory} style={{ marginTop: 12 }}>
                <span>Voice Channels</span>
                <Plus size={14} className={styles.channelCategoryAdd} onClick={() => { setNewChannelType('VOICE'); setShowCreateChannel(true); }} />
              </div>
              {voiceChannels.map(ch => {
                const normKey = activeServer?.name ? `${activeServer.name.toLowerCase()}:${ch.name.toLowerCase()}` : '';
                let vu = [...(voiceChannelUsersMap[ch.id] || (normKey ? voiceChannelUsersMap[normKey] : undefined) || [])];
                if (activeVoiceChannelId === ch.id && user && !vu.some(v => v.userId === user.id)) {
                  vu.unshift({ userId: user.id, username: user.username, avatarUrl: user.avatarUrl || undefined, socketId: 'local' });
                }
                return (
                  <div key={ch.id}>
                    <div className={`${styles.channelItem} ${activeVoiceChannelId === ch.id ? styles.channelItemActive : ''}`} onClick={() => { joinVoiceChannel(ch); setMobileNavOpen(false); }}>
                      <Volume2 size={16} className={styles.channelIcon} />
                      <span style={{ flex: 1, fontWeight: 500 }}>{ch.name}</span>
                      {activeVoiceChannelId === ch.id && <span className={styles.voiceLiveTagSmall}>●</span>}
                    </div>
                    {vu.length > 0 && (
                      <div style={{ paddingLeft: 24, paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 4, margin: '2px 0 6px' }}>
                        {vu.map(v => {
                          const isSelf = v.userId === user.id;
                          const muted = isSelf ? isMuted : false;
                          const deaf = isSelf ? isDeafened : false;
                          const speaking = speakingUsers.has(v.socketId || '') || (isSelf && speakingUsers.has('local'));
                          const isSharingThisUser = (isSelf && isScreenSharing) || (v.socketId && activeStreams.has(v.socketId));
                          return (
                            <div key={v.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                                backgroundImage: v.avatarUrl ? `url(${v.avatarUrl})` : undefined,
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                boxShadow: speaking ? '0 0 0 2px #57f287' : 'none',
                                transition: 'box-shadow 0.15s'
                              }}>
                                {!v.avatarUrl && v.username.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: speaking ? '#57f287' : 'var(--text-secondary)' }}>
                                {v.username}
                              </span>
                              {isSharingThisUser && (
                                <button
                                  className="btn-primary"
                                  style={{ padding: '2px 6px', fontSize: '0.65rem', background: '#ed4245', borderRadius: 4, height: 20, cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const vCh = voiceChannels.find(c => c.id === activeVoiceChannelId || c.name.toLowerCase() === 'general voice');
                                    if (vCh) { setActiveChannel(vCh); setIsHome(false); }
                                    if (v.socketId) setWatchingStreamSocketId(v.socketId);
                                  }}
                                  title="Watch Stream"
                                >
                                  🔴 LIVE
                                </button>
                              )}
                              {muted && <MicOff size={12} style={{ color: 'var(--red)', opacity: 0.85 }} />}
                              {deaf && <Headphones size={12} style={{ color: 'var(--red)', opacity: 0.85 }} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {/* Voice connected bar */}
        {activeVoiceChannelId && (
          <div className={styles.voiceConnectedBar}>
            <div className={styles.voiceConnectedTop}>
              <div className={styles.voiceConnectedDot} />
              <div className={styles.voiceConnectedInfo} style={{ cursor: 'pointer' }} onClick={() => {
                const vCh = voiceChannels.find(c => c.id === activeVoiceChannelId || c.name.toLowerCase() === 'general voice');
                if (vCh) { setActiveChannel(vCh); setIsHome(false); }
              }}>
                <div className={styles.voiceConnectedText}>Voice Connected</div>
                <div className={styles.voiceConnectedChannel}>
                  {voiceChannels.find(c => c.id === activeVoiceChannelId)?.name || 'Voice Channel'}
                </div>
              </div>
              <button className={styles.voiceDisconnectBtn} onClick={leaveVoiceChannel} title="Disconnect">
                <PhoneOff size={14} />
              </button>
            </div>
            {/* Voice controls row: Screenshare & Camera */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', background: isScreenSharing ? 'var(--accent)' : 'rgba(255,255,255,0.06)' }} onClick={toggleScreenShare} title="Share Screen">
                <Monitor size={14} /> {isScreenSharing ? 'Sharing' : 'Screen'}
              </button>
              <button className="btn-secondary" style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', background: isCamOn ? 'var(--accent)' : 'rgba(255,255,255,0.06)' }} onClick={() => setIsCamOn(!isCamOn)} title="Toggle Camera">
                <Video size={14} /> {isCamOn ? 'Cam On' : 'Camera'}
              </button>
            </div>
          </div>
        )}

        {/* User Panel */}
        <div className={styles.userPanel}>
          <div className={styles.userPanelAvatar}
            style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            onClick={() => setSelectedUserForProfile(user)}>
            {!user.avatarUrl && user.username.charAt(0).toUpperCase()}
            <div className={styles.statusDot} />
          </div>
          <div className={styles.userPanelInfo} onClick={() => setSelectedUserForProfile(user)}>
            <div className={styles.userPanelName}>{user.username}</div>
            <div className={styles.userPanelStatus}>{activeVoiceChannelId ? '🎤 In Voice' : 'Online'}</div>
          </div>
          <div className={styles.userPanelActions}>
            <button className={styles.userPanelBtn} onClick={toggleMic} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={16} style={{ color: '#ed4245' }} /> : <Mic size={16} />}
            </button>
            <button className={styles.userPanelBtn} onClick={() => setIsDeafened(!isDeafened)} title={isDeafened ? 'Undeafen' : 'Deafen'}>
              <Headphones size={16} style={isDeafened ? { color: '#ed4245' } : {}} />
            </button>
            <button className={styles.userPanelBtn} onClick={() => setShowSettings(true)} title="Settings"><Settings size={16} /></button>
          </div>
        </div>
      </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      {isHome ? (
        activeDmUser ? (
          <div className={styles.chatArea}>
            <div className={styles.chatHeader}>
              <button className={styles.mobileMenuBtn} onClick={() => setMobileNavOpen(true)} title="Menu"><Menu size={20} /></button>
              <div className={styles.chatHeaderLeft}>
                <div className={styles.dmUserAvatar} style={activeDmUser.avatarUrl ? { backgroundImage: `url(${activeDmUser.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  {!activeDmUser.avatarUrl && activeDmUser.username.charAt(0).toUpperCase()}
                </div>
                <span className={styles.chatHeaderName}>@{activeDmUser.username}</span>
              </div>
              <div className={styles.chatHeaderActions}>
                <button className={styles.chatHeaderBtn} onClick={() => startCall(activeDmUser, 'voice')} title="Voice Call"><Phone size={18} /></button>
                <button className={styles.chatHeaderBtn} onClick={() => startCall(activeDmUser, 'video')} title="Video Call"><Video size={18} /></button>
                <button className={styles.chatHeaderBtn} onClick={() => setSelectedUserForProfile(activeDmUser)} title="Profile"><UserCheck size={18} /></button>
              </div>
            </div>
            <div className={styles.chatContent}>
              <div className={styles.messagesWrapper}>
                <div className={styles.messagesContainer}>
                  <div className={styles.welcomeMessage}>
                    <div className={styles.welcomeHash} style={activeDmUser.avatarUrl ? { backgroundImage: `url(${activeDmUser.avatarUrl})`, backgroundSize: 'cover' } : {}}>
                      {!activeDmUser.avatarUrl && activeDmUser.username.charAt(0).toUpperCase()}
                    </div>
                    <h2 className={styles.welcomeTitle}>{activeDmUser.username}</h2>
                    <p className={styles.welcomeDesc}>Start of your DM history with @{activeDmUser.username}</p>
                  </div>
                  {dmMessages.map(msg => <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderId === user.id} />)}
                  <div ref={dmMessagesEndRef} />
                </div>
                {renderMessageInput(true)}
              </div>
            </div>
          </div>
        ) : (
          /* Friends Hub */
          <div className={styles.friendsPage}>
            <div className={styles.friendsHeader}>
              <button className={styles.mobileMenuBtn} onClick={() => setMobileNavOpen(true)} title="Menu"><Menu size={20} /></button>
              <span className={styles.friendsTitle}><Users size={18} style={{ display: 'inline', marginRight: 8 }} />Friends</span>
              <div className={styles.friendsTabs}>
                {(['online', 'all', 'pending', 'add'] as const).map(tab => (
                  <button key={tab} className={`${styles.friendsTab} ${friendsTab === tab ? styles.friendsTabActive : ''} ${tab === 'add' ? styles.addFriendTab : ''}`} onClick={() => setFriendsTab(tab)}>
                    {tab === 'online' ? `Online (${onlineFriends.length})` : tab === 'all' ? `All (${friends.length})` : tab === 'pending' ? `Pending (${pendingReceived.length})` : 'Add Friend'}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.friendsList}>
              {friendsTab === 'add' ? (
                <div className={styles.addFriendSection}>
                  <h3>ADD FRIEND</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Add a friend with their Arise Username.</p>
                  <div className={styles.addFriendInputGroup}>
                    <input className={styles.addFriendInput} placeholder="Enter a Username" value={addFriendInput} onChange={e => setAddFriendInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendFriendRequest()} />
                    <button className="btn-primary" onClick={sendFriendRequest}>Send Request</button>
                  </div>
                  {friendStatusMsg && <div style={{ marginTop: 12, color: friendStatusMsg.error ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{friendStatusMsg.text}</div>}
                </div>
              ) : friendsTab === 'pending' ? (
                <div>
                  <h4 className={styles.memberCategory}>Incoming ({pendingReceived.length})</h4>
                  {pendingReceived.map(req => (
                    <div key={req.id} className={styles.friendItem}>
                      <div className={styles.friendAvatar} style={req.sender.avatarUrl ? { backgroundImage: `url(${req.sender.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        {!req.sender.avatarUrl && req.sender.username.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.friendInfo}><div className={styles.friendName}>{req.sender.username}</div><div className={styles.friendStatusText}>Incoming Friend Request</div></div>
                      <div className={styles.friendActions}>
                        <button className={styles.friendActionBtn} style={{ background: 'var(--green)', color: '#000' }} onClick={() => handleFriendRequestAction(req.id, 'ACCEPT')}><Check size={18} /></button>
                        <button className={styles.friendActionBtn} style={{ background: 'rgba(237,66,69,0.2)', color: 'var(--red)' }} onClick={() => handleFriendRequestAction(req.id, 'REJECT')}><X size={18} /></button>
                      </div>
                    </div>
                  ))}
                  {pendingReceived.length === 0 && <div className={styles.emptyState}><p>No pending requests</p></div>}
                </div>
              ) : (
                <div>
                  <h4 className={styles.memberCategory}>{friendsTab === 'online' ? `Online — ${onlineFriends.length}` : `All Friends — ${friends.length}`}</h4>
                  {(friendsTab === 'online' ? onlineFriends : friends).map(f => (
                    <div key={f.id} className={styles.friendItem}>
                      <div className={styles.friendAvatar} style={f.avatarUrl ? { backgroundImage: `url(${f.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}} onClick={() => openDirectMessage(f)}>
                        {!f.avatarUrl && f.username.charAt(0).toUpperCase()}
                        <div className={styles.statusDot} style={{ background: isUserOnline(f.id) ? 'var(--green)' : 'var(--text-muted)' }} />
                      </div>
                      <div className={styles.friendInfo} onClick={() => openDirectMessage(f)}>
                        <div className={styles.friendName}>{f.username}</div>
                        <div className={styles.friendStatusText}>{isUserOnline(f.id) ? '● Online' : '● Offline'}</div>
                      </div>
                      <div className={styles.friendActions}>
                        <button className={styles.friendActionBtn} onClick={() => openDirectMessage(f)} title="Message"><MessageSquare size={16} /></button>
                        <button className={styles.friendActionBtn} onClick={() => startCall(f, 'voice')} title="Voice Call"><Phone size={16} /></button>
                        <button className={styles.friendActionBtn} onClick={() => startCall(f, 'video')} title="Video Call"><Video size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {friends.length === 0 && <div className={styles.emptyState}><Users size={48} className={styles.emptyStateIcon} /><h3>No Friends Yet</h3><p>Click Add Friend to get started!</p></div>}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* Server Channel Area */
        <div className={styles.chatArea}>
          {activeChannel ? (
            <>
              <div className={styles.chatHeader}>
                <button className={styles.mobileMenuBtn} onClick={() => setMobileNavOpen(true)} title="Menu"><Menu size={20} /></button>
                <div className={styles.chatHeaderLeft}>
                  {activeChannel.type === 'TEXT' ? <Hash size={20} className={styles.chatHeaderHash} /> : <Volume2 size={20} className={styles.chatHeaderHash} />}
                  <span className={styles.chatHeaderName}>{activeChannel.name}</span>
                </div>
                <div className={styles.chatHeaderActions}>
                  <button className={`${styles.chatHeaderBtn} ${showMembers ? styles.chatHeaderBtnActive : ''}`} onClick={() => setShowMembers(!showMembers)} title="Members"><Users size={18} /></button>
                </div>
              </div>
              <div className={styles.chatContent}>
                <div className={styles.messagesWrapper}>
                  {activeChannel.type === 'TEXT' ? (
                    <>
                      <div className={styles.messagesContainer}>
                        <div className={styles.welcomeMessage}>
                          <div className={styles.welcomeHash}><Hash size={32} /></div>
                          <h2 className={styles.welcomeTitle}>Welcome to #{activeChannel.name}!</h2>
                          <p className={styles.welcomeDesc}>This is the start of the #{activeChannel.name} channel.</p>
                        </div>
                        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isOwn={msg.user.id === user.id} />)}
                        <div ref={messagesEndRef} />
                      </div>
                      {renderMessageInput(false)}
                    </>
                  ) : (
                    <VoiceChannelView channel={activeChannel} />
                  )}
                </div>
                {/* Members sidebar */}
                {showMembers && activeChannel.type === 'TEXT' && (
                  <div className={`${styles.memberList} ${mobileMembersOpen ? styles.mobileMembersDrawerOpen : ''}`}>
                    <div className={styles.memberCategory}>Online — {serverMembers.filter(m => isUserOnline(m.id)).length}</div>
                    {serverMembers.filter(m => isUserOnline(m.id)).map(m => (
                      <div key={m.id} className={styles.memberItem} onClick={() => setSelectedUserForProfile(m)}>
                        <div className={styles.memberAvatar} style={m.avatarUrl ? { backgroundImage: `url(${m.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                          {!m.avatarUrl && m.username.charAt(0).toUpperCase()}
                          <div className={`${styles.memberStatus} ${styles.memberOnline}`} />
                        </div>
                        <div className={styles.memberInfo}><div className={styles.memberName}>{m.username}</div></div>
                      </div>
                    ))}
                    <div className={styles.memberCategory} style={{ marginTop: 12 }}>Offline — {serverMembers.filter(m => !isUserOnline(m.id)).length}</div>
                    {serverMembers.filter(m => !isUserOnline(m.id)).map(m => (
                      <div key={m.id} className={styles.memberItem} style={{ opacity: 0.5 }} onClick={() => setSelectedUserForProfile(m)}>
                        <div className={styles.memberAvatar} style={m.avatarUrl ? { backgroundImage: `url(${m.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                          {!m.avatarUrl && m.username.charAt(0).toUpperCase()}
                          <div className={`${styles.memberStatus} ${styles.memberOffline}`} />
                        </div>
                        <div className={styles.memberInfo}><div className={styles.memberName}>{m.username}</div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <MessageSquare size={64} className={styles.emptyStateIcon} />
              <h3 className={styles.emptyStateTitle}>Select a Channel</h3>
              <p>Pick a text or voice channel</p>
            </div>
          )}
        </div>
      )}

      {/* ── INCOMING CALL TOAST ── */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div className={styles.incomingCallToast} initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}>
            <div className={styles.incomingCallIcon}><PhoneCall size={24} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{incomingCall.fromUsername}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Incoming {incomingCall.type} call...</div>
            </div>
            <button className={styles.callAnswerBtn} onClick={answerCall} title="Answer"><Phone size={18} /></button>
            <button className={styles.callRejectBtn} onClick={rejectCall} title="Decline"><PhoneOff size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE CALL OVERLAY ── */}
      <AnimatePresence>
        {activeCall && (
          <motion.div className={styles.callOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <audio ref={callRemoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

            {/* Background animated gradient */}
            <div className={styles.callBgGlow} />

            {activeCall.type === 'video' ? (
              <>
                <div className={styles.videoGrid}>
                  <video ref={remoteVideoRef} autoPlay playsInline className={styles.remoteVideo} />
                  <video ref={localVideoRef} autoPlay playsInline muted className={styles.localVideo} />
                </div>
                <div className={styles.callStatusBar}>
                  <div className={`${styles.callStatusDot} ${styles[`callStatusDot_${callStatus}`]}`} />
                  <span className={styles.callStatusText}>
                    {callStatus === 'calling' && 'Calling...'}
                    {callStatus === 'ringing' && 'Connecting...'}
                    {callStatus === 'connected' && formatCallDuration(callDuration)}
                    {callStatus === 'reconnecting' && 'Reconnecting...'}
                    {callStatus === 'failed' && 'Connection Lost'}
                  </span>
                </div>
              </>
            ) : (
              <div className={styles.callContent}>
                {/* Remote user - main focus */}
                <div className={styles.callMainUser}>
                  <div className={styles.callAvatarWrapper}>
                    {/* Audio level ring */}
                    <div
                      className={styles.callAudioRing}
                      style={{
                        transform: `scale(${1 + callAudioLevel * 0.25})`,
                        opacity: callStatus === 'connected' ? 0.3 + callAudioLevel * 0.7 : 0,
                        borderColor: callAudioLevel > 0.1 ? '#43b581' : 'rgba(67, 181, 129, 0.3)',
                      }}
                    />
                    {/* Pulsing ring when calling/ringing */}
                    {(callStatus === 'calling' || callStatus === 'ringing') && (
                      <div className={styles.callPulseRing} />
                    )}
                    <div
                      className={styles.callAvatarLarge}
                      style={activeCall.targetUser.avatarUrl ? { backgroundImage: `url(${activeCall.targetUser.avatarUrl})`, backgroundSize: 'cover' } : {}}
                    >
                      {!activeCall.targetUser.avatarUrl && activeCall.targetUser.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.callUserName}>{activeCall.targetUser.username}</div>

                  {/* Status badge */}
                  <div className={`${styles.callStatusBadge} ${styles[`callStatus_${callStatus}`]}`}>
                    <div className={`${styles.callStatusDot} ${styles[`callStatusDot_${callStatus}`]}`} />
                    {callStatus === 'calling' && 'Calling...'}
                    {callStatus === 'ringing' && 'Connecting...'}
                    {callStatus === 'connected' && `Connected • ${formatCallDuration(callDuration)}`}
                    {callStatus === 'reconnecting' && 'Reconnecting...'}
                    {callStatus === 'failed' && 'Connection Failed'}
                  </div>

                  {/* Audio indicator */}
                  {callStatus === 'connected' && (
                    <div className={styles.callAudioBars}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={styles.callAudioBar}
                          style={{
                            height: `${Math.max(4, callAudioLevel * 24 * (1 + Math.sin(Date.now() / 200 + i) * 0.3))}px`,
                            backgroundColor: callAudioLevel > 0.05 ? '#43b581' : 'rgba(255,255,255,0.2)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Your mic status - small pill at top */}
                <div className={styles.callSelfPill}>
                  <div className={styles.callSelfAvatar} style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: 'cover' } : {}}>
                    {!user.avatarUrl && user.username.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.username}</span>
                  {callMicMuted ? <MicOff size={14} style={{ color: '#ed4245' }} /> : <Mic size={14} style={{ color: '#43b581' }} />}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className={styles.callControls}>
              <button
                className={`${styles.callBtn} ${callMicMuted ? styles.callBtnMuted : ''}`}
                onClick={() => { setCallMicMuted(!callMicMuted); callLocalStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = callMicMuted; }); }}
                title={callMicMuted ? 'Unmute' : 'Mute'}
              >
                {callMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              {activeCall.type === 'video' && (
                <button
                  className={`${styles.callBtn} ${callCamOff ? styles.callBtnMuted : ''}`}
                  onClick={() => { setCallCamOff(!callCamOff); callLocalStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = callCamOff; }); }}
                  title={callCamOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  <Camera size={22} />
                </button>
              )}
              <button
                className={`${styles.callBtn} ${styles.callBtnEnd}`}
                onClick={() => { if (socket && activeCall.peerSocketId) socket.emit('dm-call-end', { toSocketId: activeCall.peerSocketId }); endCall(); }}
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SETTINGS MODAL ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div className={styles.settingsOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className={styles.settingsClose} onClick={() => setShowSettings(false)} title="Close (Esc)"><X size={20} /></button>
            <div className={styles.settingsSidebar}>
              <div className={styles.settingsNav}>
                <div className={styles.settingsCategory}>User Settings</div>
                <button className={`${styles.settingsItem} ${settingsTab === 'account' ? styles.settingsItemActive : ''}`} onClick={() => setSettingsTab('account')}>My Account</button>
                <button className={`${styles.settingsItem} ${settingsTab === 'profile' ? styles.settingsItemActive : ''}`} onClick={() => setSettingsTab('profile')}>Profile</button>
                <div className={styles.settingsCategory} style={{ marginTop: 16 }}>App Settings</div>
                <button className={`${styles.settingsItem} ${settingsTab === 'appearance' ? styles.settingsItemActive : ''}`} onClick={() => setSettingsTab('appearance')}>Appearance</button>
                <button className={`${styles.settingsItem} ${settingsTab === 'voice' ? styles.settingsItemActive : ''}`} onClick={() => setSettingsTab('voice')}>Voice & Video</button>
                <button className={`${styles.settingsItem} ${settingsTab === 'notifications' ? styles.settingsItemActive : ''}`} onClick={() => setSettingsTab('notifications')}>Notifications</button>
                <div className={styles.settingsDivider} />
                <div className={styles.settingsCategory}>Arise Info</div>
                <button className={`${styles.settingsItem}`} onClick={() => { alert('Arise v1.0.0 — Built with love 💜'); }}>About Arise</button>
                <div className={styles.settingsDivider} />
                <button className={`${styles.settingsItem} ${styles.settingsItemDanger}`} onClick={handleLogout}><LogOut size={14} style={{ display: 'inline', marginRight: 6 }} />Log Out</button>
              </div>
            </div>
            <div className={styles.settingsContent}>
              {settingsTab === 'account' && (
                <>
                  <h2 className={styles.settingsTitle}>My Account</h2>
                  {/* Profile Card */}
                  <div className={styles.settingsProfileCard}>
                    <div className={styles.settingsBannerPreview} style={editBannerUrl ? { backgroundImage: `url(${editBannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}} />
                    <div className={styles.settingsAvatarWrapper}>
                      <div className={styles.settingsAvatar} style={editAvatarUrl ? { backgroundImage: `url(${editAvatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        {!editAvatarUrl && user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.settingsOnlineDot} />
                    </div>
                    <div className={styles.settingsProfileInfo}>
                      <div className={styles.settingsProfileName}>{user.username}</div>
                      <div className={styles.settingsProfileEmail}>{user.email}</div>
                    </div>
                  </div>
                  {profileSaveMsg && <div style={{ color: 'var(--green)', marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Check size={16} />{profileSaveMsg}</div>}
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>Account Info</div>
                    <div className={styles.settingsInfoRow}>
                      <span className={styles.settingsInfoLabel}>Username</span>
                      <span className={styles.settingsInfoValue}>@{user.username}</span>
                    </div>
                    <div className={styles.settingsInfoRow}>
                      <span className={styles.settingsInfoLabel}>Email</span>
                      <span className={styles.settingsInfoValue}>{user.email}</span>
                    </div>
                    <div className={styles.settingsInfoRow}>
                      <span className={styles.settingsInfoLabel}>Account ID</span>
                      <span className={styles.settingsInfoValue} style={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }}>{user.id}</span>
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'profile' && (
                <>
                  <h2 className={styles.settingsTitle}>Edit Profile</h2>

                  <div className={styles.profileEditLayout}>
                    {/* ── LEFT: Form Fields ── */}
                    <div className={styles.profileEditForm}>
                      {profileSaveMsg && (
                        <div style={{ color: profileSaveMsg.includes('failed') || profileSaveMsg.includes('error') ? 'var(--red)' : 'var(--green)', marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: profileSaveMsg.includes('failed') || profileSaveMsg.includes('error') ? 'rgba(237,66,69,0.12)' : 'rgba(87,242,135,0.12)' }}>
                          <Check size={16} />{profileSaveMsg}
                        </div>
                      )}

                      {/* Avatar */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>Avatar</div>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundImage: editAvatarUrl ? `url(${editAvatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', background: editAvatarUrl ? undefined : (editAccentColor || '#6366f1'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: '#fff', flexShrink: 0, border: '3px solid var(--border)' }}>
                            {!editAvatarUrl && user.username.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label className="btn-primary" style={{ cursor: 'pointer', padding: '8px 18px', fontSize: '0.85rem', display: 'inline-block', borderRadius: 6 }}>
                              Upload Avatar
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setEditAvatarUrl(r.result as string); r.readAsDataURL(f); }} />
                            </label>
                            <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => {
                              const COLORS = ['5865F2','57F287','FEE75C','EB459E','ED4245','F47FFF','00B0F4'];
                              let hash = 0;
                              for (let i = 0; i < user.username.length; i++) hash = user.username.charCodeAt(i) + ((hash << 5) - hash);
                              setEditAvatarUrl(`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(user.username)}&backgroundColor=${COLORS[Math.abs(hash) % COLORS.length]}`);
                            }}>Generate Avatar</button>
                          </div>
                        </div>
                      </div>

                      {/* Banner */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>Profile Banner</div>
                        <div className={styles.bannerPreviewRow}>
                          <div className={styles.bannerThumb} style={editBannerUrl ? { backgroundImage: `url(${editBannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, ${editAccentColor||'#6366f1'} 0%, #a855f7 100%)` }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label className="btn-secondary" style={{ cursor: 'pointer', padding: '7px 14px', fontSize: '0.82rem', display: 'inline-block', borderRadius: 6 }}>
                              Change Banner
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setEditBannerUrl(r.result as string); r.readAsDataURL(f); }} />
                            </label>
                            {editBannerUrl && <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem', color: 'var(--red)' }} onClick={() => setEditBannerUrl('')}>Remove</button>}
                          </div>
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>Profile Color</div>
                        <div className={styles.colorPickerPresets}>
                          {['#6366f1','#5865f2','#eb459e','#57f287','#fee75c','#a855f7','#ed4245','#00b0f4','#ff7043','#1db954'].map(color => (
                            <div
                              key={color}
                              className={`${styles.colorPresetCircle} ${editAccentColor === color ? styles.colorPresetCircleActive : ''}`}
                              style={{ background: color }}
                              onClick={() => setEditAccentColor(color)}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>

                      {/* About Me */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>About Me <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>{editAbout.length}/200</span></div>
                        <textarea className={styles.settingsTextarea} placeholder="Tell everyone a little about yourself..." value={editAbout} onChange={e => setEditAbout(e.target.value)} rows={4} maxLength={200} />
                      </div>

                      {/* Custom Status */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>Custom Status</div>
                        <input className={styles.modalInput} placeholder="e.g. Chilling 🎮" value={editCustomStatus} onChange={e => setEditCustomStatus(e.target.value)} maxLength={60} />
                      </div>

                      {/* Pronouns */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>Pronouns</div>
                        <input className={styles.modalInput} placeholder="e.g. he/him, she/her, they/them" value={editPronouns} onChange={e => setEditPronouns(e.target.value)} maxLength={20} />
                      </div>

                      {/* Auto-badges info */}
                      <div className={styles.settingsSection}>
                        <div className={styles.settingsSectionTitle}>Your Badges <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>— earned automatically</span></div>
                        {user.badges && user.badges.length > 0 ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {user.badges.split(',').filter(Boolean).map(bKey => {
                              const b = BADGE_MAP[bKey.trim()];
                              const Icon = BadgeIcons[bKey.trim()];
                              if (!b || !Icon) return null;
                              return (
                                <div key={bKey} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: b.bg, border: `1px solid ${b.color}40` }}>
                                  <Icon size={18} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: b.color }}>{b.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-tertiary)' }}>
                            🏆 No badges yet — create a server, make friends, or send messages to earn them!
                          </div>
                        )}
                      </div>

                      <button className="btn-primary" onClick={saveProfile} style={{ marginTop: 16, width: '100%', padding: '11px 0', fontSize: '0.95rem', fontWeight: 700 }}>Save Changes</button>
                    </div>

                    {/* ── RIGHT: Live Profile Card Preview ── */}
                    <div className={styles.profileEditPreview}>
                      <div className={styles.previewLabel}>PREVIEW</div>
                      <div className={styles.profileCardPreview} style={{ borderColor: editAccentColor || '#6366f1' }}>
                        <div className={styles.profileCardBanner} style={editBannerUrl ? { backgroundImage: `url(${editBannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, ${editAccentColor||'#6366f1'} 0%, #a855f7 100%)` }} />
                        <div className={styles.profileCardAvatarWrap}>
                          <div className={styles.profileCardAvatar} style={{ background: editAvatarUrl ? 'transparent' : (editAccentColor||'#6366f1'), backgroundImage: editAvatarUrl ? `url(${editAvatarUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                            {!editAvatarUrl && user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className={styles.profileCardOnlineDot} />
                        </div>
                        <div className={styles.profileCardBody}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className={styles.profileCardName}>{user.username}</span>
                            {editPronouns && <span className={styles.profilePronouns}>{editPronouns}</span>}
                          </div>
                          <div className={styles.profileCardTag}>@{user.username.toLowerCase()}</div>
                          {editCustomStatus && <div className={styles.profileCardStatus}>💭 {editCustomStatus}</div>}
                          {/* Show auto-badges */}
                          {user.badges && user.badges.length > 0 && (
                            <div className={styles.profileCardBadges}>
                              {user.badges.split(',').filter(Boolean).map(bKey => {
                                const b = BADGE_MAP[bKey.trim()];
                                const Icon = BadgeIcons[bKey.trim()];
                                if (!b || !Icon) return null;
                                return (
                                  <div key={bKey} className={styles.profileCardBadge} title={b.label} style={{ background: b.bg }}>
                                    <Icon size={16} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {editAbout && <div className={styles.profileCardAbout}>{editAbout}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}


              {settingsTab === 'appearance' && (

                <>
                  <h2 className={styles.settingsTitle}>Appearance</h2>
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>Theme</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {[{ name: 'Dark', bg: '#09090b', accent: '#6366f1' }, { name: 'AMOLED', bg: '#000000', accent: '#6366f1' }, { name: 'Midnight', bg: '#0d1117', accent: '#58a6ff' }].map(t => (
                        <div key={t.name} style={{ padding: '12px 20px', borderRadius: 8, background: t.bg, border: `2px solid ${t.accent}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.accent }} />
                          <span style={{ fontSize: '0.8rem', color: '#fff' }}>{t.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Currently using Dark theme. Custom theme switching coming soon!</div>
                  </div>
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>Message Display</div>
                    <div className={styles.settingsToggleRow}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Compact Mode</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Make messages smaller and more compact</div>
                      </div>
                      <div style={{ width: 44, height: 24, background: 'var(--border)', borderRadius: 12, position: 'relative', cursor: 'pointer', opacity: 0.5 }}>
                        <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: 3, transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'voice' && (
                <>
                  <h2 className={styles.settingsTitle}>Voice & Video Settings</h2>
                  
                  {/* Input Device Selection */}
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>INPUT DEVICE (MICROPHONE)</div>
                    <select
                      className={styles.modalInput}
                      style={{ marginTop: 6, background: 'var(--bg-tertiary)', color: '#fff', cursor: 'pointer' }}
                      value={selectedInputDevice}
                      onChange={e => setSelectedInputDevice(e.target.value)}
                    >
                      <option value="">Default Microphone</option>
                      {audioInputDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Output Device Selection */}
                  <div className={styles.settingsSection} style={{ marginTop: 14 }}>
                    <div className={styles.settingsSectionTitle}>OUTPUT DEVICE (HEADPHONES / SPEAKERS)</div>
                    <select
                      className={styles.modalInput}
                      style={{ marginTop: 6, background: 'var(--bg-tertiary)', color: '#fff', cursor: 'pointer' }}
                      value={selectedOutputDevice}
                      onChange={e => setSelectedOutputDevice(e.target.value)}
                    >
                      <option value="">Default Output Device</option>
                      {audioOutputDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Headphones / Speaker ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mic Test Visualizer */}
                  <div className={styles.settingsSection} style={{ marginTop: 16 }}>
                    <div className={styles.settingsSectionTitle}>MIC TEST</div>
                    <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 10 }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                        Speak into your mic to test if audio is being picked up correctly.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          className={micTestState === 'recording' ? 'btn-danger' : micTestState === 'playing' ? 'btn-primary' : 'btn-primary'}
                          style={{
                            padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap',
                            background: micTestState === 'recording' ? '#ed4245' : micTestState === 'playing' ? '#57f287' : undefined,
                            color: micTestState === 'playing' ? '#000' : '#fff', fontWeight: 700
                          }}
                          disabled={micTestState !== 'idle'}
                          onClick={async () => {
                            if (micTestState !== 'idle') return;
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({
                                audio: {
                                  echoCancellation: true,
                                  noiseSuppression: true,
                                  autoGainControl: true,
                                  sampleRate: { ideal: 48000 },
                                  deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
                                },
                              });

                              setMicTestState('recording');
                              setMicTestVolume(0);

                              const mediaRecorder = new MediaRecorder(stream);
                              const chunks: Blob[] = [];
                              mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

                              const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                              const audioCtx = new AudioCtxClass();
                              const analyser = audioCtx.createAnalyser();
                              analyser.fftSize = 256;
                              const source = audioCtx.createMediaStreamSource(stream);
                              source.connect(analyser);

                              const data = new Uint8Array(analyser.frequencyBinCount);
                              let recordingActive = true;

                              const checkVolume = () => {
                                if (!recordingActive) return;
                                analyser.getByteFrequencyData(data);
                                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                                setMicTestVolume(Math.min(Math.round((avg / 50) * 100), 100));
                                requestAnimationFrame(checkVolume);
                              };
                              checkVolume();

                              mediaRecorder.start();

                              setTimeout(() => {
                                recordingActive = false;
                                try { mediaRecorder.stop(); } catch {}
                                stream.getTracks().forEach(t => t.stop());
                                audioCtx.close();

                                mediaRecorder.onstop = () => {
                                  setMicTestState('playing');
                                  const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                                  const audioUrl = URL.createObjectURL(blob);
                                  const playbackAudio = new Audio(audioUrl);
                                  playbackAudio.volume = 1.0;
                                  
                                  if (selectedOutputDevice && (playbackAudio as any).setSinkId) {
                                    (playbackAudio as any).setSinkId(selectedOutputDevice).catch(() => {});
                                  }

                                  playbackAudio.play().catch(() => {});
                                  playbackAudio.onended = () => {
                                    setMicTestState('idle');
                                    setMicTestVolume(0);
                                    URL.revokeObjectURL(audioUrl);
                                  };
                                };
                              }, 2500);
                            } catch {
                              alert('Unable to access microphone for test.');
                              setMicTestState('idle');
                              setMicTestVolume(0);
                            }
                          }}
                        >
                          {micTestState === 'recording' ? '🎙️ Recording...' : micTestState === 'playing' ? '🔊 Playing Back...' : 'Test Mic 🎙️'}
                        </button>

                        <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${micTestVolume}%`,
                              background: 'linear-gradient(90deg, #57f287 0%, #fee75c 70%, #ed4245 100%)',
                              borderRadius: 6,
                              transition: 'width 0.05s ease-out',
                              boxShadow: '0 0 10px rgba(87,242,135,0.5)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: micTestVolume > 0 ? '#57f287' : 'var(--text-muted)', minWidth: 35 }}>
                          {micTestVolume}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Toggles */}
                  <div className={styles.settingsSection} style={{ marginTop: 16 }}>
                    <div className={styles.settingsSectionTitle}>VOICE PROCESSING</div>
                    <div className={styles.settingsToggleRow}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Echo Cancellation</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prevents audio feedback in voice channels</div>
                      </div>
                      <div style={{ width: 44, height: 24, background: 'var(--accent)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}>
                        <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, right: 3 }} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.settingsSection} style={{ marginTop: 16 }}>
                    <div className={styles.settingsSectionTitle}>TURN/ICE Configuration</div>
                    <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      ✅ Dynamic TURN relay active — cross-region voice calls supported (India ↔ Pakistan, etc.)
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'notifications' && (
                <>
                  <h2 className={styles.settingsTitle}>Notifications</h2>
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>Desktop Notifications</div>
                    <div className={styles.settingsToggleRow}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable Notifications</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Get notified for new messages</div>
                      </div>
                      <button style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }} onClick={() => {
                        if ('Notification' in window) {
                          Notification.requestPermission().then(p => alert(p === 'granted' ? '✅ Notifications enabled!' : '❌ Permission denied'));
                        }
                      }}>Enable</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SERVER SETTINGS MODAL ── */}
      <AnimatePresence>
        {showServerSettings && activeServer && (
          <motion.div className={styles.modalOverlay} onClick={() => setShowServerSettings(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modal} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <h2 className={styles.modalTitle}>Server Settings</h2>
              <p className={styles.modalSubtitle}>{activeServer.name}</p>
              <div style={{ marginBottom: 20 }}>
                <label className={styles.settingsLabel}>Invite Code</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className={styles.modalInput} value={activeServer.inviteCode || 'No invite code'} readOnly style={{ flex: 1 }} />
                  <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(activeServer.inviteCode || ''); }}>Copy</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn-primary" onClick={() => { setShowServerSettings(false); setShowCreateChannel(true); }}><Plus size={16} /> Create Channel</button>
                <button className="btn-secondary" onClick={() => setShowServerSettings(false)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── USER PROFILE POPUP ── */}
      <AnimatePresence>
        {selectedUserForProfile && (
          <motion.div className={styles.modalOverlay} onClick={() => setSelectedUserForProfile(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.profilePopup} style={{ borderColor: selectedUserForProfile.accentColor || '#6366f1' }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <button className={styles.profileCloseBtn} onClick={() => setSelectedUserForProfile(null)}><X size={16} /></button>
              
              {/* Banner */}
              <div className={styles.profileBanner} style={{
                ...(selectedUserForProfile.bannerUrl ? { backgroundImage: `url(${selectedUserForProfile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, ${selectedUserForProfile.accentColor || '#6366f1'} 0%, #a855f7 100%)` })
              }} />

              {/* Avatar */}
              <div className={styles.profileAvatarLarge} style={{
                borderColor: '#1a1b22',
                ...(selectedUserForProfile.avatarUrl ? { backgroundImage: `url(${selectedUserForProfile.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: selectedUserForProfile.accentColor || 'var(--accent)' })
              }}>
                {!selectedUserForProfile.avatarUrl && selectedUserForProfile.username.charAt(0).toUpperCase()}
              </div>

              {/* Profile Details Body */}
              <div className={styles.profileBody}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={styles.profileName}>{selectedUserForProfile.username}</span>
                  {selectedUserForProfile.pronouns && <span className={styles.profilePronouns}>{selectedUserForProfile.pronouns}</span>}
                </div>
                
                <div className={styles.profileTag}>@{selectedUserForProfile.username.toLowerCase()}</div>

                {/* Custom Status */}
                {selectedUserForProfile.customStatus && (
                  <div className={styles.profileCustomStatus}>
                    💭 {selectedUserForProfile.customStatus}
                  </div>
                )}

                {/* Badges List — Discord-style icon row */}
                {selectedUserForProfile.badges && (
                  <div className={styles.profileBadges}>
                    {selectedUserForProfile.badges.split(',').filter(Boolean).map(bKey => {
                      const b = BADGE_MAP[bKey.trim()];
                      const Icon = BadgeIcons[bKey.trim()];
                      if (!b || !Icon) return null;
                      return (
                        <div key={bKey} className={styles.profileBadge} title={b.label} style={{ background: b.bg }}>
                          <Icon size={18} />
                        </div>
                      );
                    })}
                  </div>
                )}


                <div className={styles.profileSection} style={{ marginTop: 12 }}>
                  <div className={styles.profileSectionTitle}>About Me</div>
                  <div className={styles.profileSectionContent}>{selectedUserForProfile.about || "Hey there! I'm using Arise. 🚀"}</div>
                </div>

                <div className={styles.profileSection}>
                  <div className={styles.profileSectionTitle}>Status</div>
                  <div className={styles.profileSectionContent}>{isUserOnline(selectedUserForProfile.id) ? '🟢 Online Now' : '⚫ Offline'}</div>
                </div>

                {selectedUserForProfile.id !== user?.id && (
                  <div className={styles.profileActions} style={{ marginTop: 12, display: 'flex', gap: 8, flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', flex: 1 }} onClick={() => { const target = selectedUserForProfile; setSelectedUserForProfile(null); openDirectMessage(target); }}>
                        <MessageSquare size={14} /> Send Message
                      </button>
                      <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => { const target = selectedUserForProfile; setSelectedUserForProfile(null); startCall(target, 'voice'); }}>
                        <Phone size={14} /> Call
                      </button>
                    </div>

                    {/* Friend Status Button */}
                    {friends.some(f => f.id === selectedUserForProfile.id) ? (
                      <button className="btn-secondary" style={{ width: '100%', padding: '8px 0', fontSize: '0.82rem', color: '#57f287', background: 'rgba(87,242,135,0.1)', border: '1px solid rgba(87,242,135,0.3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <UserCheck size={14} /> Friends
                      </button>
                    ) : pendingSent.some(p => p.receiverId === selectedUserForProfile.id) ? (
                      <button className="btn-secondary" style={{ width: '100%', padding: '8px 0', fontSize: '0.82rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <UserPlus size={14} /> Friend Request Sent
                      </button>
                    ) : (
                      <button className="btn-primary" style={{ width: '100%', padding: '8px 0', fontSize: '0.82rem', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => {
                        fetch('/api/friends', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ userId: selectedUserForProfile.id }),
                        }).then(r => r.json()).then(data => {
                          if (data.success) {
                            fetchFriends();
                            if (data.targetUser?.id) socket?.emit('send-friend-request', { targetUserId: data.targetUser.id, friendship: data.friendship });
                          }
                        });
                      }}>
                        <UserPlus size={14} /> Add Friend
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE / JOIN SERVER MODAL ── */}
      <AnimatePresence>
        {showCreateServer && (
          <motion.div className={styles.modalOverlay} onClick={() => setShowCreateServer(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modal} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  className={addServerTab === 'create' ? 'btn-primary' : 'btn-secondary'}
                  style={{ flex: 1 }}
                  onClick={() => setAddServerTab('create')}
                >
                  <Plus size={14} /> Create Server
                </button>
                <button
                  className={addServerTab === 'join' ? 'btn-primary' : 'btn-secondary'}
                  style={{ flex: 1 }}
                  onClick={() => setAddServerTab('join')}
                >
                  <Link size={14} /> Join Server
                </button>
              </div>

              {addServerTab === 'create' ? (
                <>
                  <h2 className={styles.modalTitle}>Create a Server</h2>
                  <p className={styles.modalSubtitle}>Your server is where you and your friends hang out.</p>
                  <input
                    className={styles.modalInput}
                    placeholder="Server name (e.g. My Awesome Club)"
                    value={newServerName}
                    onChange={e => setNewServerName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createServer()}
                    autoFocus
                  />
                  <div className={styles.modalActions}>
                    <button className="btn-secondary" onClick={() => setShowCreateServer(false)}>Cancel</button>
                    <button className="btn-primary" onClick={createServer}>Create Server</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className={styles.modalTitle}>Join a Server</h2>
                  <p className={styles.modalSubtitle}>Enter an invite code or link below to join an existing server.</p>
                  <input
                    className={styles.modalInput}
                    placeholder="e.g. abc12345 or https://arise.app/invite/abc12345"
                    value={joinInviteInput}
                    onChange={e => { setJoinInviteInput(e.target.value); setJoinServerError(''); }}
                    onKeyDown={e => e.key === 'Enter' && joinServerByCode(joinInviteInput)}
                    autoFocus
                  />
                  {joinServerError && <div style={{ color: '#ed4245', fontSize: '0.85rem', marginTop: 6, fontWeight: 600 }}>{joinServerError}</div>}
                  <div className={styles.modalActions}>
                    <button className="btn-secondary" onClick={() => setShowCreateServer(false)}>Cancel</button>
                    <button className="btn-primary" onClick={() => joinServerByCode(joinInviteInput)}>Join Server</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── CREATE CHANNEL MODAL ── */}
      <AnimatePresence>
        {showCreateChannel && (
          <motion.div className={styles.modalOverlay} onClick={() => setShowCreateChannel(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modal} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <h2 className={styles.modalTitle}>Create Channel</h2>
              <p className={styles.modalSubtitle}>in {activeServer?.name}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className={newChannelType === 'TEXT' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }} onClick={() => setNewChannelType('TEXT')}><Hash size={14} /> Text</button>
                <button className={newChannelType === 'VOICE' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }} onClick={() => setNewChannelType('VOICE')}><Volume2 size={14} /> Voice</button>
              </div>
              <input className={styles.modalInput} placeholder="channel-name" value={newChannelName} onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s/g, '-'))} onKeyDown={e => e.key === 'Enter' && createChannel()} autoFocus />
              <div className={styles.modalActions}>
                <button className="btn-secondary" onClick={() => setShowCreateChannel(false)}>Cancel</button>
                <button className="btn-primary" onClick={createChannel}>Create Channel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden global audio element for DM Calls */}
      <audio ref={callRemoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
    </>
  );
}

