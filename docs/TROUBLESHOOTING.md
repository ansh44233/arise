# Troubleshooting

## Voice/Video Issues

### "Cannot connect to voice channel"

1. Check browser mic/camera permissions
2. Ensure WebRTC is not blocked by firewall (UDP ports 49152-65535)
3. Try TURN server if behind strict NAT

### "Audio cuts out during calls"

- This is usually a network quality issue
- Check your internet connection
- Try reducing video quality in settings

## Connection Issues

### "Disconnected from server"

1. Check if server is running
2. Check CORS settings match your client URL
3. Verify JWT token hasn't expired

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Expired/invalid token | Re-login |
| `Socket disconnect loop` | useEffect dependency issue | Update to latest version |
| `ICE failed` | NAT/firewall blocking WebRTC | Configure TURN server |
