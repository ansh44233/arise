# Environment Setup

## Development

```bash
# Clone repo
git clone https://github.com/ansh44233/arise
cd arise

# Install dependencies
npm install

# Copy env template
cp .env.example .env

# Fill in your values
nano .env

# Start development server
npm run dev
```

## Required Services

### MongoDB

Use [MongoDB Atlas](https://cloud.mongodb.com) (free tier):
1. Create cluster
2. Add database user
3. Whitelist IP (0.0.0.0/0 for dev)
4. Copy connection string to `MONGODB_URI`

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for JWT signing | `random-32-char-string` |
| `PORT` | Server port | `3000` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
