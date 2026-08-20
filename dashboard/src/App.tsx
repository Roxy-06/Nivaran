import { Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import AdminDashboard from "./admin/AdminDashboard";
import DepartmentDashboard from "./department/DepartmentDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/department"
        element={
          <ProtectedRoute role="department_user">
            <DepartmentDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
