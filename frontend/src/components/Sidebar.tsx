import { useLocation, Link } from "react-router-dom";

const NAV = [
  { to: "/", label: "書庫" },
  { to: "/search", label: "搜尋" },
  { to: "/tags", label: "知識標籤" },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar__title">Knodex</div>
      <ul className="sidebar__nav">
        {NAV.map(({ to, label }) => (
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
    </aside>
  );
}
