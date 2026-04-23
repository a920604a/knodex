import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { isAdmin, logout } = useAuth();

  const nav = [
    { to: "/", label: "書庫" },
    { to: "/query", label: "AI 問答" },
    { to: "/search", label: "搜尋" },
    { to: "/tags", label: "知識標籤" },
    ...(isAdmin ? [{ to: "/admin", label: "管理後台" }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__title">Knodex</div>
      <ul className="sidebar__nav">
        {nav.map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              className={`sidebar__item${pathname === to ? " sidebar__item--active" : ""}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <button
        onClick={logout}
        style={{ margin: "auto 12px 16px", fontSize: 13, cursor: "pointer" }}
      >
        登出
      </button>
    </aside>
  );
}
