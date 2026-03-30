import React, { useState } from "react";
import { http } from "../service/http";
import { useNavigate } from "react-router-dom";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (!email) {
      setError("Ingresa tu correo");
      return;
    }

    try {
      setLoading(true);
      await http.post("/auth/forgot-password", { email });
      setMensaje("Si el correo existe recibirás un email con instrucciones.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-cyan-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Recuperar contraseña</h1>
        <p className="text-sm text-slate-500 mb-6">Ingresa tu correo y te enviaremos un link para restablecer tu contraseña.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@rids.cl"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          {error && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">{error}</div>}
          {mensaje && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm">{mensaje}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm text-white font-semibold hover:bg-cyan-700 transition disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link de recuperación"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
          >
            Volver al login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;