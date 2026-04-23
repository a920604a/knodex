import { useEffect, useState } from "react";
import { apiJson } from "../lib/api";

interface UserStats {
  id: string;
  email: string;
  role: string;
  pdf_limit: number;
  daily_query_limit: number;
  pdf_count: number;
  today_query_count: number;
  created_at: string;
}

interface SystemStats {
  total_users: number;
  total_documents: number;
  today_total_queries: number;
  worker_queue_depth: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ pdf_limit: 0, daily_query_limit: 0 });

  useEffect(() => {
    apiJson<UserStats[]>("/admin/users").then(setUsers);
    apiJson<SystemStats>("/admin/stats").then(setStats);
  }, []);

  const startEdit = (u: UserStats) => {
    setEditingId(u.id);
    setEditValues({ pdf_limit: u.pdf_limit, daily_query_limit: u.daily_query_limit });
  };

  const saveEdit = async (id: string) => {
    const updated = await apiJson<UserStats>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(editValues),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    setEditingId(null);
  };

  return (
    <div style={{ padding: "24px 16px", maxWidth: 960, margin: "0 auto" }}>
      <h2>Admin Dashboard</h2>

      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          {[
            ["Total Users", stats.total_users],
            ["Total Documents", stats.total_documents],
            ["Queries Today", stats.today_total_queries],
            ["Queue Depth", stats.worker_queue_depth],
          ].map(([label, val]) => (
            <div key={label as string} style={{ flex: 1, background: "var(--color-surface, #f5f5f5)", padding: 16, borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{val}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <h3>Users</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
            <th style={{ padding: "8px 4px" }}>Email</th>
            <th style={{ padding: "8px 4px" }}>Role</th>
            <th style={{ padding: "8px 4px" }}>PDFs</th>
            <th style={{ padding: "8px 4px" }}>PDF Limit</th>
            <th style={{ padding: "8px 4px" }}>Queries Today</th>
            <th style={{ padding: "8px 4px" }}>Daily Query Limit</th>
            <th style={{ padding: "8px 4px" }}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 4px" }}>{u.email}</td>
              <td style={{ padding: "8px 4px" }}>{u.role}</td>
              <td style={{ padding: "8px 4px" }}>{u.pdf_count}</td>
              <td style={{ padding: "8px 4px" }}>
                {editingId === u.id ? (
                  <input
                    type="number"
                    value={editValues.pdf_limit}
                    onChange={(e) => setEditValues((v) => ({ ...v, pdf_limit: Number(e.target.value) }))}
                    style={{ width: 60 }}
                  />
                ) : (
                  u.pdf_limit
                )}
              </td>
              <td style={{ padding: "8px 4px" }}>{u.today_query_count}</td>
              <td style={{ padding: "8px 4px" }}>
                {editingId === u.id ? (
                  <input
                    type="number"
                    value={editValues.daily_query_limit}
                    onChange={(e) => setEditValues((v) => ({ ...v, daily_query_limit: Number(e.target.value) }))}
                    style={{ width: 60 }}
                  />
                ) : (
                  u.daily_query_limit
                )}
              </td>
              <td style={{ padding: "8px 4px" }}>
                {editingId === u.id ? (
                  <button onClick={() => saveEdit(u.id)}>Save</button>
                ) : (
                  <button onClick={() => startEdit(u)}>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
