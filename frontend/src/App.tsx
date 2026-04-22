import { BrowserRouter, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DocumentListPage from "./pages/DocumentListPage";
import ReaderPage from "./pages/ReaderPage";
import SearchPage from "./pages/SearchPage";
import TagManager from "./components/TagManager";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<DocumentListPage />} />
            <Route path="/reader/:id" element={<ReaderPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/tags" element={<TagManager />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
