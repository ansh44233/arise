# Performance Notes

## WebRTC Optimizations

- **Codec preference**: VP8/H264 auto-negotiated based on browser support
- **Bandwidth estimation**: Built-in REMB/TWCC for adaptive bitrate
- **ICE restart**: Automatic reconnection on network change

## Socket.IO Optimizations

- **Room-based broadcasting**: Events only sent to relevant users
- **Binary frames**: Used for large data payloads
- **Heartbeat interval**: 25s ping, 60s timeout

## MongoDB Optimizations

- Indexes on `serverId`, `channelId` for fast message queries
- TTL index on session tokens (7 days)
- Lean queries for read-only operations

## React Optimizations

- `useCallback` + `useRef` pattern for stable socket listeners
- `React.memo` on message list items
- Virtual scroll for large message histories (>500 messages)
