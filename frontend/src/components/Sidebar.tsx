import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Icons = {
  library: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="4" height="10" rx="1"/>
      <rect x="6" y="1" width="4" height="12" rx="1"/>
      <rect x="11" y="4" width="4" height="9" rx="1"/>
    </svg>
  ),
  query: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M2 8h8M2 12h5"/>
      <circle cx="13" cy="11" r="2.5"/>
      <path d="M15 13.5l1.5 1.5"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5"/>
      <path d="M10.5 10.5L14 14"/>
    </svg>
  ),
  tags: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z"/>
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  admin: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
    </svg>
  ),
};

export default function Sidebar() {
  const { pathname } = useLocation();
  const { isAdmin, logout } = useAuth();

  const nav = [
    { to: "/", label: "書庫", icon: Icons.library },
    { to: "/query", label: "AI 問答", icon: Icons.query },
    { to: "/search", label: "搜尋", icon: Icons.search },
    { to: "/tags", label: "知識標籤", icon: Icons.tags },
    ...(isAdmin ? [{ to: "/admin", label: "管理後台", icon: Icons.admin }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__title">Knodex</div>
      <ul className="sidebar__nav">
        {nav.map(({ to, label, icon }) => (
          <li key={to}>
            <Link
              to={to}
              className={`sidebar__item${pathname === to ? " sidebar__item--active" : ""}`}
            >
              <span className="sidebar__icon">{icon}</span>
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <button className="btn btn--ghost btn--sm" onClick={logout} style={{ marginTop: "auto", alignSelf: "flex-start" }}>
        登出
      </button>
    </aside>
  );
}
