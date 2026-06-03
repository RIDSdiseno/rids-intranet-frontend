// src/components/hooks/useAuth.ts
export const useAuth = () => {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  const userRole = String(user?.rol ?? "").toUpperCase().trim();

  const isCliente = userRole === "CLIENTE";
  const isTecnico = userRole === "TECNICO";
  const isVentas = userRole === "VENTAS";
  const isAdministracion = userRole === "ADMINISTRACION";

  // Admin técnico normal
  const isAdmin = userRole === "ADMIN";

  // Admin ampliado: sirve para pantallas donde ADMIN y ADMINISTRACION pueden gestionar
  const isAdminLike = userRole === "ADMIN" || userRole === "ADMINISTRACION";

  // Facturación: lectura para VENTAS y ADMINISTRACION
  const canViewFacturas =
    userRole === "ADMINISTRACION" || userRole === "VENTAS";

  // Facturación: acciones solo ADMINISTRACION
  const canManageFacturas = userRole === "ADMINISTRACION";

  const canAssignTickets =
    userRole === "ADMIN" || userRole === "ADMINISTRACION";

  return {
    user,
    userRole,
    isCliente,
    isTecnico,
    isVentas,
    isAdmin,
    isAdministracion,
    isAdminLike,
    canViewFacturas,
    canManageFacturas,
  };
};