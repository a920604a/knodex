import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import DocumentListPage from "./pages/DocumentListPage";
import QueryPage from "./pages/QueryPage";
import ReaderPage from "./pages/ReaderPage";
import SearchPage from "./pages/SearchPage";
import TagManager from "./components/TagManager";
import { isReaderMode } from "./lib/mode";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ReaderModeShell() {
  return (
    <div className="app-content" style={{ marginLeft: 0 }}>
      <Routes>
        <Route path="/" element={<DocumentListPage />} />
        <Route path="/reader/:id" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function FullModeShell() {
  const { token } = useAuth();
  if (!token) return <AuthPage />;
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DocumentListPage /></ProtectedRoute>} />
          <Route path="/reader/:id" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/tags" element={<ProtectedRoute><TagManager /></ProtectedRoute>} />
          <Route path="/query" element={<ProtectedRoute><QueryPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const base = import.meta.env.VITE_BASE_PATH || "/";
  const basename = base.replace(/\/$/, "") || "/";
  return (
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        {isReaderMode ? (
          <ReaderModeShell />
        ) : (
          <AuthProvider>
            <FullModeShell />
          </AuthProvider>
        )}
      </ThemeProvider>
    </BrowserRouter>
  );
}
