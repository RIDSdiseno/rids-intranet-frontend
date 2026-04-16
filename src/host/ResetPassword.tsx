import React, { useMemo, useState } from "react";
import { http } from "../service/http";
import { useNavigate, useSearchParams } from "react-router-dom";

function validatePassword(password: string) {
  return {
    minLength: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const passwordChecks = useMemo(() => validatePassword(newPassword), [newPassword]);
  const passwordIsValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    newPassword.length > 0 &&
    confirm.length > 0 &&
    newPassword === confirm;

  const canSubmit =
    !!token &&
    passwordIsValid &&
    passwordsMatch &&
    !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (!newPassword || !confirm) {
      setError("Completa todos los campos");
      return;
    }

    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!passwordChecks.minLength) {
      setError("La contraseña debe tener al menos 12 caracteres");
      return;
    }

    if (!passwordChecks.hasUpper) {
      setError("La contraseña debe incluir al menos una mayúscula");
      return;
    }

    if (!passwordChecks.hasLower) {
      setError("La contraseña debe incluir al menos una minúscula");
      return;
    }

    if (!passwordChecks.hasNumber) {
      setError("La contraseña debe incluir al menos un número");
      return;
    }

    try {
      setLoading(true);
      await http.post("/auth/reset-password", { token, newPassword });
      setMensaje("Contraseña actualizada correctamente. Redirigiendo...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Token inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-rose-200 p-8 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-rose-700 mb-2">Link inválido</h1>
          <p className="text-sm text-slate-500 mb-4">
            El link de recuperación no es válido.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white font-semibold hover:bg-cyan-700 transition"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  const itemClass = (ok: boolean) =>
    ok ? "text-emerald-600" : "text-slate-500";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-cyan-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Nueva contraseña
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Ingresa tu nueva contraseña.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {showNewPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-1">
            <p className={itemClass(passwordChecks.minLength)}>
              • Mínimo 12 caracteres
            </p>
            <p className={itemClass(passwordChecks.hasUpper)}>
              • Al menos una mayúscula
            </p>
            <p className={itemClass(passwordChecks.hasLower)}>
              • Al menos una minúscula
            </p>
            <p className={itemClass(passwordChecks.hasNumber)}>
              • Al menos un número
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {showConfirmPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
            {confirm.length > 0 && !passwordsMatch && (
              <p className="mt-2 text-sm text-rose-600">
                Las contraseñas no coinciden
              </p>
            )}
            {confirm.length > 0 && passwordsMatch && (
              <p className="mt-2 text-sm text-emerald-600">
                Las contraseñas coinciden
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm">
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm text-white font-semibold hover:bg-cyan-700 transition disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Restablecer contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;