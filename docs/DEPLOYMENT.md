# Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB instance
- Environment variables configured

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=3000
CLIENT_URL=https://your-domain.com
```

## Railway Deployment

1. Fork or clone this repository
2. Connect to Railway
3. Add environment variables
4. Deploy automatically on push

## Docker Deployment

```bash
docker build -t arise .
docker run -p 3000:3000 --env-file .env arise
```
