# API Reference

## Authentication

All API routes (except `/api/auth/*`) require a Bearer token.

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Servers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/servers` | List user's servers |
| POST | `/api/servers` | Create a server |
| GET | `/api/servers/:id` | Get server details |

### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels/:serverId` | List channels |
| POST | `/api/channels` | Create channel |
