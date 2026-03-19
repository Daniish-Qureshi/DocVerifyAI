import {
  login as loginAPI,
  register as registerAPI,
  analyzeDocument,
  getScanHistory,
  getStats,
  deleteAccount,
  updateProfile,
} from "./services/api";
import { useState, useRef, useCallback } from "react";

const PAGES = {
  HOME: "home",
  SCAN: "scan",
  RESULT: "result",
  HISTORY: "history",
  LOGIN: "login",
  PROFILE: "profile",
  REGISTER: "register",
};

const mockAnalyze = () =>
  new Promise((res) =>
    setTimeout(
      () =>
        res({
          verdict: Math.random() > 0.4 ? "AUTHENTIC" : "FRAUDULENT",
          confidence: Math.floor(Math.random() * 25 + 75),
          docType: [
            "Aadhaar Card",
            "PAN Card",
            "Passport",
            "Marksheet",
            "Invoice",
          ][Math.floor(Math.random() * 5)],
          checks: [
            { label: "Font Consistency", pass: Math.random() > 0.3 },
            { label: "Logo Integrity", pass: Math.random() > 0.3 },
            { label: "Metadata Validity", pass: Math.random() > 0.3 },
            { label: "Watermark Detection", pass: Math.random() > 0.3 },
            { label: "Layout Structure", pass: Math.random() > 0.2 },
            { label: "Color Profile Match", pass: Math.random() > 0.3 },
          ],
        }),
      3500,
    ),
  );

const mockHistory = [
  {
    id: 1,
    name: "aadhaar_front.jpg",
    type: "Aadhaar Card",
    verdict: "AUTHENTIC",
    confidence: 94,
    date: "12 Mar 2026",
  },
  {
    id: 2,
    name: "pan_card.png",
    type: "PAN Card",
    verdict: "FRAUDULENT",
    confidence: 87,
    date: "11 Mar 2026",
  },
  {
    id: 3,
    name: "marksheet.jpg",
    type: "Marksheet",
    verdict: "AUTHENTIC",
    confidence: 91,
    date: "10 Mar 2026",
  },
  {
    id: 4,
    name: "passport_scan.png",
    type: "Passport",
    verdict: "AUTHENTIC",
    confidence: 98,
    date: "09 Mar 2026",
  },
];

export default function DocVerifyAI() {
  const [page, setPage] = useState(PAGES.HOME);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null,
  );
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const fileRef = useRef();
  const cameraRef = useRef();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    authentic: 0,
    fraudulent: 0,
    suspicious: 0,
  });
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState("");

  const handleFile = useCallback(
    async (file) => {
      if (
        !file ||
        (!file.type.startsWith("image/") && file.type !== "application/pdf")
      )
        return;
      if (!user) {
        alert("Please login first!");
        setPage(PAGES.LOGIN);
        return;
      }

      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      setPage(PAGES.SCAN);
      setScanning(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await analyzeDocument(formData);
        setResult(res.data.result);
        setScanning(false);
        setPage(PAGES.RESULT);
      } catch (err) {
        alert(err.response?.data?.message || "Analysis failed!");
        setScanning(false);
        setPage(PAGES.HOME);
      }
    },
    [user],
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onLogin = async () => {
    try {
      const res = await loginAPI(loginForm);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setPage(PAGES.HOME);
    } catch (err) {
      alert(err.response?.data?.message || "Login failed!");
    }
  };

  const onRegister = async () => {
    try {
      const res = await registerAPI(registerForm);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setPage(PAGES.HOME);
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed!");
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await getScanHistory();
      setHistory(res.data.scans);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const onUpdateProfile = async () => {
    try {
      const res = await updateProfile({ name: editName });
      const updatedUser = { ...user, name: res.data.user.name };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Update failed!");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030712",
        color: "#e2e8f0",
        fontFamily: "'Courier New', monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .mono { font-family: 'Space Mono', monospace; }
        .rajdhani { font-family: 'Rajdhani', sans-serif; }
        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #00d4ff, #00ff88, #00d4ff, transparent); animation: scanMove 2s linear infinite; box-shadow: 0 0 20px #00d4ff, 0 0 40px #00d4ff88; }
        @keyframes scanMove { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .pulse-ring { position: absolute; border-radius: 50%; border: 2px solid #00d4ff44; animation: pulseRing 2s ease-out infinite; }
        @keyframes pulseRing { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        .glow-text { text-shadow: 0 0 20px #00d4ff, 0 0 40px #00d4ff88; }
        .glow-green { text-shadow: 0 0 20px #00ff88, 0 0 40px #00ff8888; }
        .glow-red { text-shadow: 0 0 20px #ff3366, 0 0 40px #ff336688; }
        .card-border { border: 1px solid #1e293b; background: linear-gradient(135deg, #0f172a 0%, #0a0f1e 100%); }
        .nav-link { cursor: pointer; transition: all 0.2s; padding: 8px 16px; border-radius: 4px; }
        .nav-link:hover { background: #0f172a; color: #00d4ff; }
        .btn-primary { background: linear-gradient(135deg, #0ea5e9, #00d4ff); border: none; color: #030712; font-weight: 700; padding: 12px 28px; border-radius: 4px; cursor: pointer; font-family: 'Space Mono', monospace; font-size: 13px; transition: all 0.2s; letter-spacing: 1px; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 25px #00d4ff44; }
        .btn-ghost { background: transparent; border: 1px solid #1e293b; color: #94a3b8; padding: 12px 28px; border-radius: 4px; cursor: pointer; font-family: 'Space Mono', monospace; font-size: 13px; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #00d4ff; color: #00d4ff; }
        .upload-zone { border: 2px dashed #1e293b; border-radius: 8px; transition: all 0.3s; cursor: pointer; position: relative; overflow: hidden; }
        .upload-zone:hover, .upload-zone.active { border-color: #00d4ff; background: #00d4ff08; box-shadow: 0 0 30px #00d4ff11, inset 0 0 30px #00d4ff08; }
        .check-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #0f172a; }
        .badge-auth { background: #00ff8822; color: #00ff88; border: 1px solid #00ff8844; padding: 4px 12px; border-radius: 2px; font-size: 11px; letter-spacing: 2px; }
        .badge-fraud { background: #ff336622; color: #ff3366; border: 1px solid #ff336644; padding: 4px 12px; border-radius: 2px; font-size: 11px; letter-spacing: 2px; }
        .corner-tl { position: absolute; top: 0; left: 0; width: 20px; height: 20px; border-top: 2px solid #00d4ff; border-left: 2px solid #00d4ff; }
        .corner-tr { position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-top: 2px solid #00d4ff; border-right: 2px solid #00d4ff; }
        .corner-bl { position: absolute; bottom: 0; left: 0; width: 20px; height: 20px; border-bottom: 2px solid #00d4ff; border-left: 2px solid #00d4ff; }
        .corner-br { position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; border-bottom: 2px solid #00d4ff; border-right: 2px solid #00d4ff; }
        .grid-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(#0f172a22 1px, transparent 1px), linear-gradient(90deg, #0f172a22 1px, transparent 1px); background-size: 40px 40px; }
        input[type=text], input[type=email], input[type=password] { background: #0f172a; border: 1px solid #1e293b; color: #e2e8f0; padding: 12px 16px; border-radius: 4px; width: 100%; font-family: 'Space Mono', monospace; font-size: 13px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #00d4ff; box-shadow: 0 0 0 3px #00d4ff11; }
        .progress-bar { height: 4px; background: #0f172a; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #0ea5e9, #00d4ff, #00ff88); border-radius: 2px; transition: width 0.5s; }
        .history-row { padding: 14px 16px; border-bottom: 1px solid #0f172a; transition: background 0.2s; display: flex; align-items: center; gap: 16px; cursor: pointer; }
        .history-row:hover { background: #0f172a; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0f1e; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        .fade-in { animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .rotate-slow { animation: rotateSlow 8s linear infinite; }
        @keyframes rotateSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="grid-bg" />

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          borderBottom: "1px solid #1e293b",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#03071299",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
          onClick={() => setPage(PAGES.HOME)}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "2px solid #00d4ff",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span style={{ color: "#00d4ff", fontSize: 14, fontWeight: 700 }}>
              D
            </span>
            <div
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                background: "#00ff88",
                borderRadius: "50%",
              }}
            />
          </div>
          <span
            className="mono"
            style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}
          >
            DocVerify<span style={{ color: "#00d4ff" }}>AI</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            className="nav-link mono"
            style={{
              fontSize: 12,
              color: page === PAGES.HOME ? "#00d4ff" : "#64748b",
            }}
            onClick={() => setPage(PAGES.HOME)}
          >
            HOME
          </span>
          <span
            className="nav-link mono"
            style={{
              fontSize: 12,
              color: page === PAGES.HISTORY ? "#00d4ff" : "#64748b",
            }}
            onClick={() => {
              fetchHistory();
              setPage(PAGES.HISTORY);
            }}
          >
            HISTORY
          </span>
          {user && (
            <span
              className="nav-link mono"
              style={{
                fontSize: 12,
                color: page === PAGES.PROFILE ? "#00d4ff" : "#64748b",
              }}
              onClick={() => {
                fetchStats();
                setPage(PAGES.PROFILE);
              }}
            >
              PROFILE
            </span>
          )}
          {user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginLeft: 8,
              }}
            >
              <div
                onClick={() => {
                  fetchStats();
                  setPage(PAGES.PROFILE);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#0ea5e9,#00d4ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#030712",
                  cursor: "pointer",
                  border:
                    page === PAGES.PROFILE
                      ? "2px solid #00ff88"
                      : "2px solid transparent",
                }}
              >
                {user.name[0]}
              </div>
              <button
                className="btn-ghost"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  setUser(null);
                  setPage(PAGES.HOME);
                }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              className="btn-primary"
              style={{ marginLeft: 8, padding: "8px 16px", fontSize: 11 }}
              onClick={() => setPage(PAGES.LOGIN)}
            >
              LOGIN
            </button>
          )}
        </div>
      </nav>

      {/* ── PAGES ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HOME */}
        {page === PAGES.HOME && (
          <div
            className="fade-in"
            style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px" }}
          >
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#00d4ff11",
                  border: "1px solid #00d4ff33",
                  padding: "6px 16px",
                  borderRadius: 2,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    background: "#00ff88",
                    borderRadius: "50%",
                    boxShadow: "0 0 6px #00ff88",
                  }}
                />
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 2 }}
                >
                  AI-POWERED DOCUMENT FORENSICS
                </span>
              </div>
              <h1
                className="rajdhani"
                style={{
                  fontSize: "clamp(36px, 6vw, 72px)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  marginBottom: 16,
                }}
              >
                Detect{" "}
                <span className="glow-green" style={{ color: "#00ff88" }}>
                  Fake
                </span>{" "}
                Documents
                <br />
                <span style={{ color: "#00d4ff" }} className="glow-text">
                  Instantly.
                </span>
              </h1>
              <p
                className="mono"
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  maxWidth: 500,
                  margin: "0 auto 32px",
                  lineHeight: 1.8,
                }}
              >
                Upload any document — Aadhaar, PAN, Passport, Marksheet — and
                our AI will verify its authenticity in seconds.
              </p>
            </div>

            <div
              className={`upload-zone ${dragOver ? "active" : ""}`}
              style={{
                padding: "60px 40px",
                textAlign: "center",
                marginBottom: 32,
                position: "relative",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <div style={{ width: 64, height: 64, margin: "0 auto 20px" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    border: "2px solid #1e293b",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00d4ff"
                    strokeWidth="1.5"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
              </div>
              <p
                className="mono"
                style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}
              >
                Drop document here or click to upload
              </p>
              <p className="mono" style={{ fontSize: 11, color: "#334155" }}>
                PNG, JPG, JPEG, WEBP — Max 10MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>

            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <button
                className="btn-ghost"
                onClick={() => cameraRef.current.click()}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  CAPTURE FROM CAMERA
                </span>
              </button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  icon: "🛡️",
                  title: "AI Forensic Analysis",
                  desc: "Deep neural analysis of fonts, logos, watermarks, and layout patterns",
                },
                {
                  icon: "⚡",
                  title: "Instant Results",
                  desc: "Get verification results in under 5 seconds with confidence scoring",
                },
                {
                  icon: "📋",
                  title: "Multi-Document Support",
                  desc: "Aadhaar, PAN, Passport, Certificates, Invoices and more",
                },
                {
                  icon: "🔐",
                  title: "Privacy First",
                  desc: "Documents are analyzed in real-time and never stored permanently",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="card-border"
                  style={{ padding: "20px", borderRadius: 6 }}
                >
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
                  <div
                    className="rajdhani"
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#e2e8f0",
                      marginBottom: 6,
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}
                  >
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCANNING */}
        {page === PAGES.SCAN && (
          <div
            className="fade-in"
            style={{
              maxWidth: 600,
              margin: "0 auto",
              padding: "80px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "inline-block",
                marginBottom: 40,
              }}
            >
              {uploadedImage && (
                <div
                  style={{
                    position: "relative",
                    width: 280,
                    height: 200,
                    overflow: "hidden",
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                  }}
                >
                  <img
                    src={uploadedImage}
                    alt="doc"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.6,
                    }}
                  />
                  {scanning && <div className="scan-line" />}
                  <div className="corner-tl" />
                  <div className="corner-tr" />
                  <div className="corner-bl" />
                  <div className="corner-br" />
                </div>
              )}
            </div>
            <div
              style={{
                position: "relative",
                width: 80,
                height: 80,
                margin: "0 auto 32px",
              }}
            >
              <div
                className="pulse-ring"
                style={{ width: 80, height: 80, top: 0, left: 0 }}
              />
              <div
                className="pulse-ring"
                style={{
                  width: 80,
                  height: 80,
                  top: 0,
                  left: 0,
                  animationDelay: "0.5s",
                }}
              />
              <div
                style={{
                  width: 80,
                  height: 80,
                  border: "2px solid #00d4ff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#00d4ff11",
                }}
              >
                <svg
                  className="rotate-slow"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
            </div>
            <h2
              className="rajdhani glow-text"
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#00d4ff",
                marginBottom: 12,
              }}
            >
              ANALYZING DOCUMENT
            </h2>
            <p
              className="mono"
              style={{ fontSize: 12, color: "#475569", marginBottom: 32 }}
            >
              Running forensic checks...
            </p>
            <div style={{ textAlign: "left" }}>
              {[
                "Extracting metadata...",
                "Analyzing font patterns...",
                "Checking logo integrity...",
                "Scanning watermarks...",
                "Verifying layout structure...",
                "Computing authenticity score...",
              ].map((step, i) => (
                <div
                  key={i}
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "#334155",
                    padding: "6px 0",
                    borderBottom: "1px solid #0f172a11",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "#00d4ff" }}>›</span> {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULT */}
        {page === PAGES.RESULT && result && (
          <div
            className="fade-in"
            style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}
          >
            <div
              style={{
                padding: "32px",
                borderRadius: 8,
                marginBottom: 24,
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                background:
                  result.verdict === "AUTHENTIC"
                    ? "linear-gradient(135deg, #00ff8811, #0f172a)"
                    : "linear-gradient(135deg, #ff336611, #0f172a)",
                border: `1px solid ${result.verdict === "AUTHENTIC" ? "#00ff8844" : "#ff336644"}`,
              }}
            >
              <div
                className="corner-tl"
                style={{
                  borderColor:
                    result.verdict === "AUTHENTIC" ? "#00ff88" : "#ff3366",
                }}
              />
              <div
                className="corner-tr"
                style={{
                  borderColor:
                    result.verdict === "AUTHENTIC" ? "#00ff88" : "#ff3366",
                }}
              />
              <div
                className="corner-bl"
                style={{
                  borderColor:
                    result.verdict === "AUTHENTIC" ? "#00ff88" : "#ff3366",
                }}
              />
              <div
                className="corner-br"
                style={{
                  borderColor:
                    result.verdict === "AUTHENTIC" ? "#00ff88" : "#ff3366",
                }}
              />
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {result.verdict === "AUTHENTIC" ? "✓" : "✗"}
              </div>
              <div
                className={`rajdhani ${result.verdict === "AUTHENTIC" ? "glow-green" : "glow-red"}`}
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  color: result.verdict === "AUTHENTIC" ? "#00ff88" : "#ff3366",
                  letterSpacing: 4,
                  marginBottom: 8,
                }}
              >
                {result.verdict}
              </div>
              <div className="mono" style={{ fontSize: 12, color: "#64748b" }}>
                Document Type:{" "}
                <span style={{ color: "#94a3b8" }}>
                  {result.document_type || result.docType}
                </span>
              </div>
            </div>

            <div
              className="card-border"
              style={{ padding: 20, borderRadius: 6, marginBottom: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 12, color: "#64748b" }}
                >
                  CONFIDENCE SCORE
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: result.confidence > 85 ? "#00ff88" : "#fbbf24",
                  }}
                >
                  {result.confidence}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
            </div>

            {/* Forensic Checks */}
            <div
              className="card-border"
              style={{ padding: 20, borderRadius: 6, marginBottom: 24 }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "#475569",
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                FORENSIC CHECKS
              </div>
              {result.analyses
                ? Object.entries(result.analyses).map(([key, analysis], i) => (
                    <div key={i} className="check-item">
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: analysis.suspicious
                            ? "#ff336622"
                            : "#00ff8822",
                          border: `1px solid ${analysis.suspicious ? "#ff336644" : "#00ff8844"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: analysis.suspicious ? "#ff3366" : "#00ff88",
                          }}
                        >
                          {analysis.suspicious ? "✗" : "✓"}
                        </span>
                      </div>
                      <span
                        className="mono"
                        style={{ fontSize: 12, color: "#94a3b8" }}
                      >
                        {analysis.title}
                      </span>
                      <span
                        className="mono"
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          color: analysis.suspicious ? "#ff3366" : "#00ff88",
                        }}
                      >
                        {analysis.suspicious ? "SUSPICIOUS" : "CLEAN"}
                      </span>
                    </div>
                  ))
                : result.checks
                  ? result.checks.map((c, i) => (
                      <div key={i} className="check-item">
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: c.pass ? "#00ff8822" : "#ff336622",
                            border: `1px solid ${c.pass ? "#00ff8844" : "#ff336644"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: c.pass ? "#00ff88" : "#ff3366",
                            }}
                          >
                            {c.pass ? "✓" : "✗"}
                          </span>
                        </div>
                        <span
                          className="mono"
                          style={{ fontSize: 12, color: "#94a3b8" }}
                        >
                          {c.label}
                        </span>
                        <span
                          className="mono"
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            color: c.pass ? "#00ff88" : "#ff3366",
                          }}
                        >
                          {c.pass ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    ))
                  : null}
            </div>

            {uploadedImage && (
              <div
                className="card-border"
                style={{ padding: 16, borderRadius: 6, marginBottom: 24 }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    letterSpacing: 2,
                    marginBottom: 12,
                  }}
                >
                  ANALYZED DOCUMENT
                </div>
                <img
                  src={uploadedImage}
                  alt="doc"
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    borderRadius: 4,
                    opacity: 0.8,
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setPage(PAGES.HOME);
                  setUploadedImage(null);
                }}
              >
                VERIFY ANOTHER
              </button>
              <button
                className="btn-ghost"
                onClick={() => setPage(PAGES.HISTORY)}
              >
                VIEW HISTORY
              </button>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {page === PAGES.HISTORY && (
          <div
            className="fade-in"
            style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}
          >
            <div style={{ marginBottom: 32 }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "#475569",
                  letterSpacing: 2,
                  marginBottom: 8,
                }}
              >
                VERIFICATION LOGS
              </div>
              <h2
                className="rajdhani"
                style={{ fontSize: 32, fontWeight: 700 }}
              >
                History
              </h2>
            </div>
            <div
              className="card-border"
              style={{ borderRadius: 8, overflow: "hidden" }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "#0f172a",
                  borderBottom: "1px solid #1e293b",
                  display: "flex",
                  gap: 16,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "#334155", flex: 2 }}
                >
                  DOCUMENT
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "#334155", flex: 1 }}
                >
                  TYPE
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "#334155", flex: 1 }}
                >
                  VERDICT
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "#334155", flex: 1 }}
                >
                  CONFIDENCE
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "#334155", flex: 1 }}
                >
                  DATE
                </span>
              </div>
              {history.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <span
                    className="mono"
                    style={{ color: "#334155", fontSize: 12 }}
                  >
                    No scans yet — upload a document to get started!
                  </span>
                </div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="history-row">
                    <div
                      style={{
                        flex: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#475569"
                          strokeWidth="1.5"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <span
                        className="mono"
                        style={{ fontSize: 12, color: "#94a3b8" }}
                      >
                        {h.filename || h.name}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "#64748b" }}
                      >
                        {h.documentType || h.type}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        className={
                          h.verdict === "AUTHENTIC"
                            ? "badge-auth"
                            : "badge-fraud"
                        }
                        style={{ fontFamily: "Space Mono, monospace" }}
                      >
                        {h.verdict}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 12,
                          color: h.confidence > 90 ? "#00ff88" : "#fbbf24",
                        }}
                      >
                        {h.confidence}%
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "#334155" }}
                      >
                        {h.createdAt
                          ? new Date(h.createdAt).toLocaleDateString()
                          : h.date}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* LOGIN */}
        {page === PAGES.LOGIN && (
          <div
            className="fade-in"
            style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}
          >
            <div
              className="card-border"
              style={{ padding: 40, borderRadius: 8, position: "relative" }}
            >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  SECURE ACCESS
                </div>
                <h2
                  className="rajdhani"
                  style={{ fontSize: 28, fontWeight: 700 }}
                >
                  Login to <span style={{ color: "#00d4ff" }}>DocVerifyAI</span>
                </h2>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 1,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 1,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                  />
                </div>
                <button
                  className="btn-primary"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={onLogin}
                >
                  ACCESS SYSTEM
                </button>
                <div style={{ textAlign: "center" }}>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "#334155" }}
                  >
                    Don't have an account?{" "}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#00d4ff",
                      cursor: "pointer",
                    }}
                    onClick={() => setPage(PAGES.REGISTER)}
                  >
                    Register
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REGISTER */}
        {page === PAGES.REGISTER && (
          <div
            className="fade-in"
            style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}
          >
            <div
              className="card-border"
              style={{ padding: 40, borderRadius: 8, position: "relative" }}
            >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  CREATE ACCOUNT
                </div>
                <h2
                  className="rajdhani"
                  style={{ fontSize: 28, fontWeight: 700 }}
                >
                  Join <span style={{ color: "#00d4ff" }}>DocVerifyAI</span>
                </h2>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 1,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 1,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 1,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        password: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  className="btn-primary"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={onRegister}
                >
                  CREATE ACCOUNT
                </button>
                <div style={{ textAlign: "center" }}>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "#334155" }}
                  >
                    Already have an account?{" "}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#00d4ff",
                      cursor: "pointer",
                    }}
                    onClick={() => setPage(PAGES.LOGIN)}
                  >
                    Login
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {page === PAGES.PROFILE && (
          <div
            className="fade-in"
            style={{ maxWidth: 750, margin: "0 auto", padding: "60px 24px" }}
          >
            {!user ? (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <div
                  className="rajdhani"
                  style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}
                >
                  Please <span style={{ color: "#00d4ff" }}>Login</span> First
                </div>
                <p
                  className="mono"
                  style={{ fontSize: 12, color: "#475569", marginBottom: 24 }}
                >
                  You need to be logged in to view your profile.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setPage(PAGES.LOGIN)}
                >
                  GO TO LOGIN
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 32 }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 2,
                      marginBottom: 8,
                    }}
                  >
                    ACCOUNT
                  </div>
                  <h2
                    className="rajdhani"
                    style={{ fontSize: 32, fontWeight: 700 }}
                  >
                    User Profile
                  </h2>
                </div>

                <div
                  className="card-border"
                  style={{
                    borderRadius: 8,
                    padding: 32,
                    marginBottom: 20,
                    position: "relative",
                  }}
                >
                  <div className="corner-tl" />
                  <div className="corner-tr" />
                  <div className="corner-bl" />
                  <div className="corner-br" />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #0ea5e9, #00d4ff, #00ff88)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#030712",
                          border: "3px solid #00d4ff44",
                        }}
                      >
                        {user.name[0]}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          width: 14,
                          height: 14,
                          background: "#00ff88",
                          borderRadius: "50%",
                          border: "2px solid #030712",
                          boxShadow: "0 0 8px #00ff88",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        className="rajdhani"
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        {user.name}
                      </h3>
                      <div
                        className="mono"
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 8,
                        }}
                      >
                        {user.email}
                      </div>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <span
                          style={{
                            background: "#00d4ff11",
                            border: "1px solid #00d4ff33",
                            color: "#00d4ff",
                            padding: "3px 10px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontFamily: "Space Mono, monospace",
                            letterSpacing: 1,
                          }}
                        >
                          FREE PLAN
                        </span>
                        <span
                          style={{
                            background: "#00ff8811",
                            border: "1px solid #00ff8833",
                            color: "#00ff88",
                            padding: "3px 10px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontFamily: "Space Mono, monospace",
                            letterSpacing: 1,
                          }}
                        >
                          VERIFIED USER
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: "8px 16px" }}
                      onClick={() => {
                        setEditName(user.name);
                        setEditModal(true);
                      }}
                    >
                      EDIT PROFILE
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Total Scans",
                      value: stats.totalScans,
                      icon: "📄",
                      color: "#00d4ff",
                    },
                    {
                      label: "Authentic",
                      value: stats.authentic,
                      icon: "✓",
                      color: "#00ff88",
                    },
                    {
                      label: "Fraudulent",
                      value: stats.fraudulent,
                      icon: "✗",
                      color: "#ff3366",
                    },
                    {
                      label: "Accuracy Rate",
                      value:
                        stats.totalScans > 0
                          ? Math.round(
                              (stats.authentic / stats.totalScans) * 100,
                            ) + "%"
                          : "0%",
                      icon: "🎯",
                      color: "#fbbf24",
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="card-border"
                      style={{
                        padding: "20px 16px",
                        borderRadius: 6,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 20,
                          marginBottom: 8,
                          color: stat.color,
                        }}
                      >
                        {stat.icon}
                      </div>
                      <div
                        className="rajdhani"
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: stat.color,
                          lineHeight: 1,
                        }}
                      >
                        {stat.value}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: "#475569",
                          marginTop: 4,
                          letterSpacing: 1,
                        }}
                      >
                        {stat.label.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="card-border"
                  style={{ borderRadius: 8, padding: 24, marginBottom: 20 }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 2,
                      marginBottom: 20,
                    }}
                  >
                    ACCOUNT DETAILS
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    {[
                      { label: "FULL NAME", value: user.name },
                      { label: "EMAIL", value: user.email },
                      { label: "MEMBER SINCE", value: "March 2026" },
                      { label: "LAST LOGIN", value: "Today" },
                      { label: "PLAN", value: "Free (10 scans/day)" },
                      { label: "LOCATION", value: "India" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid #0f172a",
                        }}
                      >
                        <div
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: "#334155",
                            letterSpacing: 1,
                            marginBottom: 4,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 13, color: "#94a3b8" }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="card-border"
                  style={{ borderRadius: 8, padding: 24, marginBottom: 20 }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      letterSpacing: 2,
                      marginBottom: 20,
                    }}
                  >
                    SCAN ACTIVITY — LAST 7 DAYS
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      height: 80,
                    }}
                  >
                    {[4, 7, 2, 9, 3, 6, 5].map((val, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: `${(val / 9) * 70}px`,
                            background:
                              "linear-gradient(180deg, #00d4ff, #0ea5e944)",
                            borderRadius: "3px 3px 0 0",
                            position: "relative",
                            minHeight: 4,
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 2,
                              background: "#00d4ff",
                              boxShadow: "0 0 6px #00d4ff",
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 9, color: "#334155" }}
                        >
                          {["M", "T", "W", "T", "F", "S", "S"][i]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #ff336633",
                    borderRadius: 8,
                    padding: 24,
                    background: "#ff336608",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#ff3366",
                      letterSpacing: 2,
                      marginBottom: 16,
                    }}
                  >
                    DANGER ZONE
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        className="rajdhani"
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Delete Account
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: "#475569" }}
                      >
                        Permanently delete your account and all data
                      </div>
                    </div>
                    <button
                      style={{
                        background: "transparent",
                        border: "1px solid #ff336644",
                        color: "#ff3366",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "Space Mono, monospace",
                        fontSize: 11,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#ff336622")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                      onClick={async () => {
                        if (
                          window.confirm("Are you sure? This cannot be undone!")
                        ) {
                          await deleteAccount();
                          localStorage.removeItem("token");
                          localStorage.removeItem("user");
                          setUser(null);
                          setPage(PAGES.HOME);
                        }
                      }}
                    >
                      DELETE ACCOUNT
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {editModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "#00000088",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="card-border"
              style={{
                padding: 32,
                borderRadius: 8,
                width: 400,
                position: "relative",
              }}
            >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <h3
                className="rajdhani"
                style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}
              >
                Edit Profile
              </h3>
              <div style={{ marginBottom: 16 }}>
                <label
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={onUpdateProfile}
                >
                  SAVE
                </button>
                <button
                  className="btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setEditModal(false)}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid #0f172a",
          padding: "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span className="mono" style={{ fontSize: 11, color: "#1e293b" }}>
          © 2026 DocVerifyAI — AI Document Forensics
        </span>
        <span className="mono" style={{ fontSize: 11, color: "#1e293b" }}>
          Built by Danish Qureshi
        </span>
      </div>
    </div>
  );
}
