import { useState } from "react";
import { api } from "../../api/api";

export const useApi = () => {
  const [loading, setLoading] = useState(false);

  const fetchApi = async (endpoint: string, options: any = {}) => {
    setLoading(true);
    try {
      const response = await api({
        url: endpoint,
        method: options.method || "GET",
        data: options.body ? JSON.parse(options.body) : undefined,
        headers: options.headers || {},
      });

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        "Error en la API"
      );
    } finally {
      setLoading(false);
    }
  };

  return { fetchApi, loading };
};
