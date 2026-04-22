import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import DocumentListPage from "./pages/DocumentListPage";
import ReaderPage from "./pages/ReaderPage";
import SearchPage from "./pages/SearchPage";
import TagManager from "./components/TagManager";

function Nav() {
  return (
    <nav style={{ padding: "8px 16px", borderBottom: "1px solid #eee", display: "flex", gap: 16 }}>
      <Link to="/">文件</Link>
      <Link to="/search">搜尋</Link>
      <Link to="/tags">標籤</Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<DocumentListPage />} />
        <Route path="/reader/:id" element={<ReaderPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/tags" element={<TagManager />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
