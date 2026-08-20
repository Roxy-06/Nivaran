import type React from "react";
import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  role: "admin" | "department_user";
}

export default function ProtectedRoute({ children, role }: Props) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
