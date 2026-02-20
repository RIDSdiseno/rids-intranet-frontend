// src/lib/http.ts
import axios from "axios";

function getToken(): string {
  return (
    localStorage.getItem("accessToken") || // 👈 ESTE ES EL TUYO
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const token = getToken();

  console.log("[HTTP] token enviado?", !!token); // 👈 debug

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});