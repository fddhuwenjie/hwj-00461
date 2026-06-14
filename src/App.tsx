import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import DishDetail from "@/pages/DishDetail";
import Recommend from "@/pages/Recommend";
import Nutrition from "@/pages/Nutrition";
import Stats from "@/pages/Stats";
import Profile from "@/pages/Profile";
import MenuManage from "@/pages/MenuManage";
import VotePage from "@/pages/VotePage";
import FeedPage from "@/pages/FeedPage";
import WeeklyReportPage from "@/pages/WeeklyReportPage";
import Layout from "@/components/Layout";

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dish/:id" element={<DishDetail />} />
        <Route path="/menu" element={<MenuManage />} />
        <Route path="/recommend" element={<Recommend />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/weekly" element={<WeeklyReportPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
