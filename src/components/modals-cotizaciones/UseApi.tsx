import { useState } from "react";
import { http } from "../../service/http";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
}

export const useApi = () => {

  const [loading, setLoading] = useState(false);

  const fetchApi = async (endpoint: string, options: ApiOptions = {}) => {

    setLoading(true);

    try {

      const isFormData = options.body instanceof FormData;

      const response = await http({
        url: endpoint,
        method: options.method || "GET",
        data: options.body, // axios maneja objetos automáticamente
        headers: options.headers || {},
      });

      return response.data;

    } catch (error: any) {

      const status = error.response?.status;

      if (status === 400) {
        return Promise.reject({
          type: "validation",
          message: error.response?.data?.error
        });
      }

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