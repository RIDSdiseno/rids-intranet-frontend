import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        credentials: "include",
        ...options
      });

      const contentType = res.headers.get("content-type");

      let body: any = null;
      if (contentType && contentType.includes("application/json")) {
        body = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        const backendMessage =
          body?.message ||
          body?.error ||
          res.statusText ||
          "Error inesperado en el servidor";

        throw new Error(backendMessage);
      }

      return body;
    } catch (error: any) {
      // Re-lanzamos con un mensaje seguro
      throw new Error(error.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return { fetchApi, loading };
};
