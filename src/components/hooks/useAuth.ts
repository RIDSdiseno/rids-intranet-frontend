export const useAuth = () => {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  const isCliente = user?.rol === "CLIENTE";
  const isTecnico = user?.rol === "TECNICO";
  const isAdmin = user?.rol === "ADMIN";

  return {
    user,
    isCliente,
    isTecnico,
    isAdmin,
  };
};