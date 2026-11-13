# FAQ

## General

**Q: Is Arise free to use?**
A: Yes! Arise is fully open-source under the MIT License.

**Q: What browsers are supported?**
A: Chrome 90+, Firefox 88+, Edge 90+, Safari 15+. WebRTC required.

**Q: Can I self-host Arise?**
A: Absolutely. See the Deployment Guide.

## Voice & Video

**Q: Why cant I hear others in voice channels?**
A: Check browser microphone permissions and ensure your firewall allows UDP traffic.

**Q: Does Arise support screen sharing?**
A: Yes, screen sharing is supported in both voice channels and DM calls.

**Q: How many people can be in a voice channel?**
A: Up to 25 concurrent peers. Server-side SFU planned for v2.0.

## Technical

**Q: What is the tech stack?**
A: React + Redux (frontend), Node.js + Socket.IO (backend), MongoDB, WebRTC media.

**Q: Does it work behind NAT?**
A: Yes for most cases via STUN. For strict NAT, configure a TURN server.
