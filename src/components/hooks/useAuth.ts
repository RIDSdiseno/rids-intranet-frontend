export const useAuth = () => {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  return {
    user,
    isCliente: user?.rol === "CLIENTE",
    isAdmin: user?.rol !== "CLIENTE",
  };
};