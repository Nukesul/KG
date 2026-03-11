import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./components/Home";
import Login from "./components/Login";
import Admin from "./components/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import CinematicDiscover from "./components/CinematicDiscover";

export default function App() {
  return (
    <HashRouter>
      <Routes>

        {/* ===== MAIN SITE ===== */}
        <Route path="/" element={
          <>
            <Home />
            <CinematicDiscover />
          </>
        } />
        
        {/* ===== AUTH ===== */}
        <Route path="/login" element={<Login />} />

        {/* ===== PROTECTED ADMIN ===== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* ===== FALLBACK ===== */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
      
    </HashRouter>
  );
}