import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { apiJson } from "../lib/api";

export default function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const data = await apiJson<{ access_token: string }>("/auth/firebase", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken }),
      });

      const me = await apiJson<{
        id: string;
        email: string;
        role: string;
        pdf_limit: number;
        daily_query_limit: number;
      }>("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });

      login(data.access_token, me);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "登入失敗，請再試一次");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <h1 style={{ marginBottom: 8 }}>Knodex</h1>
      <p style={{ color: "var(--color-text-secondary, #666)", marginBottom: 32 }}>
        你的個人知識庫
      </p>
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 24px",
          fontSize: 15,
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {loading ? "登入中…" : "使用 Google 登入"}
      </button>
      {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}
    </div>
  );
}
