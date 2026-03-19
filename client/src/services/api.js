import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Har request mein token automatically add karo
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// AUTH
export const register = (data) => API.post("/auth/register", data);
export const login    = (data) => API.post("/auth/login", data);

// USER
export const getProfile = () => API.get("/user/profile");
export const getStats   = () => API.get("/user/stats");
export const updateProfile = (data) => API.put("/user/profile", data);
export const deleteAccount = () => API.delete("/user/delete");

// SCAN
export const analyzeDocument = (formData) =>
  API.post("/scan/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getScanHistory = () => API.get("/scan/history");
export const getScan        = (id) => API.get(`/scan/${id}`);