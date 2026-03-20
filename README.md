# DocVerifyAI 🔍

> **AI-Powered Document Verification System** — Detect fake and tampered documents instantly using multi-layer forensic analysis.

![DocVerifyAI Banner](https://img.shields.io/badge/DocVerifyAI-Document%20Forensics-00d4ff?style=for-the-badge&logo=shield&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs)
![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![Gemini](https://img.shields.io/badge/Gemini-Vision%20API-4285F4?style=flat-square&logo=google)

---

## 🚀 Live Demo

- **Frontend:** [docverifyai.vercel.app](https://doc-verify-ai-eight.vercel.app/)

---

## 📌 About

DocVerifyAI is a full-stack web application that uses artificial intelligence and computer vision techniques to verify the authenticity of documents. Upload any document — Aadhaar Card, PAN Card, Passport, Marksheet, Invoice — and the system performs multi-layer forensic analysis to determine if it's real or fake/tampered.

---

## ✨ Features

- 📤 **Document Upload** — Drag & Drop or Click to upload
- 📷 **Camera Capture** — Take photo directly from mobile browser
- 🔐 **User Authentication** — Secure JWT-based login & register
- 🤖 **5-Layer AI Analysis** — Comprehensive forensic checks
- 📊 **Confidence Score** — Percentage-based authenticity rating
- 📁 **Scan History** — View all previous verifications
- 👤 **User Profile** — Stats, activity chart, account management
- 📱 **Responsive Design** — Works on mobile and desktop

---

## 🛡️ AI Analysis Modules

| Module | Description | Weight |
|--------|-------------|--------|
| **ELA Analysis** | Error Level Analysis — detects tampered/edited regions | 25% |
| **EXIF Metadata** | Checks software used (Photoshop?), edit dates, device info | 20% |
| **Clone Detection** | Finds copy-pasted regions in document | 20% |
| **Noise Analysis** | Detects inconsistent noise patterns from editing | 15% |
| **Gemini Vision** | AI visual inspection — font, logo, layout, color check | 20% |

### Verdict System
- ✅ **AUTHENTIC** — 0-25% fraud score
- ⚠️ **SUSPICIOUS** — 25-50% fraud score  
- ❌ **FRAUDULENT** — 50%+ fraud score

---

## 🛠️ Tech Stack

### Frontend
- React.js 18 + Vite
- Tailwind CSS v4
- Axios

### Backend
- Node.js + Express.js
- MongoDB Atlas + Mongoose
- JWT Authentication
- Bcrypt Password Hashing
- Multer (File Upload)

### Python ML Service
- FastAPI + Uvicorn
- OpenCV (Image Processing)
- Pillow/PIL (ELA Analysis)
- piexif (EXIF Metadata)
- NumPy + SciPy (Noise Analysis)
- Google Gemini Vision API

### Deployment
- **Frontend** → Vercel
- **Backend** → Render
- **ML Service** → Render
- **Database** → MongoDB Atlas
- **Storage** → Cloudinary

---

## 📁 Project Structure

```
DocVerifyAI/
├── client/                  ← React Frontend
│   ├── src/
│   │   ├── DocVerifyAI.jsx  ← Main App Component
│   │   ├── services/
│   │   │   └── api.js       ← API calls
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── server/                  ← Node.js Backend
│   ├── routes/
│   │   ├── auth.js          ← Login/Register routes
│   │   ├── scan.js          ← Document scan routes
│   │   └── user.js          ← User profile routes
│   ├── models/
│   │   ├── User.js          ← User schema
│   │   └── Scan.js          ← Scan history schema
│   ├── middleware/
│   │   └── auth.js          ← JWT middleware
│   ├── server.js
│   └── package.json
│
└── ml-service/              ← Python FastAPI ML Service
    ├── main.py              ← All 5 analysis modules
    ├── requirements.txt
    └── .env
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v22+
- Python 3.11+
- MongoDB Atlas account
- Google Gemini API key (free at aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/Daniish-Qureshi/DocVerifyAI.git
cd DocVerifyAI
```

### 2. Setup ML Service
```bash
cd ml-service
pip install -r requirements.txt
```

Create `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Run:
```bash
python main.py
```

### 3. Setup Backend
```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
ML_SERVICE_URL=http://localhost:8000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run:
```bash
node server.js
```

### 4. Setup Frontend
```bash
cd client
npm install
npm run dev
```

Open: `http://localhost:5173`

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### Scan
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan/analyze` | Analyze document |
| GET | `/api/scan/history` | Get scan history |
| GET | `/api/scan/:id` | Get single scan |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/user/stats` | Get user stats |
| DELETE | `/api/user/delete` | Delete account |

### ML Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Run forensic analysis |
| GET | `/health` | Health check |

---

## 👨‍💻 Developer

**Danish Qureshi**
- GitHub: [@Daniish-Qureshi](https://github.com/Daniish-Qureshi)
- Portfolio: [danish-qureshi-6ew5.vercel.app](https://danish-qureshi-6ew5.vercel.app)
- LinkedIn: [linkedin.com/in/danish-qureshi](https://linkedin.com/in/danish-qureshi)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  <strong>Built with ❤️ by Danish Qureshi</strong><br/>
  <sub>DocVerifyAI — Detecting Fraud, One Document at a Time</sub>
</div>
