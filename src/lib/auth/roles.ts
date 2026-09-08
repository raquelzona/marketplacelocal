export type UserRole = "consumer" | "merchant" | "admin";

export const roleHome: Record<UserRole, string> = {
  consumer: "/consumidor",
  merchant: "/comerciante",
  admin: "/admin",
};

export const roleLabel: Record<UserRole, string> = {
  consumer: "Consumidor",
  merchant: "Comerciante",
  admin: "Administrador",
};

export function isUserRole(value: unknown): value is UserRole {
  return value === "consumer" || value === "merchant" || value === "admin";
}
