# DocVerifyAI - Setup Instructions

## Problem: "Analysis failed!" Error

The document scanning fails because of missing environment variables. Follow these steps to fix:

## Step 1: Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

## Step 2: Configure Environment Variables

### Server Setup
1. Copy `server/.env.example` to `server/.env`
2. Update `server/.env` with:
```env
MONGO_URI=mongodb://localhost:27017/docverifyai
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
ML_SERVICE_URL=http://localhost:8000
```

### ML Service Setup  
1. Copy `ml-service/.env.example` to `ml-service/.env`
2. Update `ml-service/.env` with:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Step 3: Start Services

### Start ML Service (Port 8000)
```bash
cd ml-service
pip install -r requirements.txt
python main.py
```

### Start Server (Port 5000)
```bash
cd server  
npm install
npm start
```

### Start Client (Port 5173)
```bash
cd client
npm install
npm run dev
```

## Step 4: Test
1. Open http://localhost:5173
2. Login or register
3. Upload a document
4. Analysis should work now

## Troubleshooting

### "ML service not configured"
- Make sure `ML_SERVICE_URL=http://localhost:8000` is set in `server/.env`

### "AI analysis unavailable"  
- Make sure `GEMINI_API_KEY` is set in `ml-service/.env`
- Check if the API key is valid

### Connection refused
- Make sure ML service is running on port 8000
- Check if ports are blocked by firewall

### MongoDB connection error
- Make sure MongoDB is installed and running
- Check `MONGO_URI` in `server/.env`
