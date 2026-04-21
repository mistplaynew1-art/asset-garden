import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CasinoLayout from "@/components/casino/CasinoLayout";
import Index from "./pages/Index";
import CasinoPage from "./pages/CasinoPage";
import OriginalsPage from "./pages/OriginalsPage";
import SlotsPage from "./pages/SlotsPage";
import LiveCasinoPage from "./pages/LiveCasinoPage";
import SportsPage from "./pages/SportsPage";
import GamePage from "./pages/GamePage";
import WalletPage from "./pages/WalletPage";
import ProfilePage from "./pages/ProfilePage";
import RewardsPage from "./pages/RewardsPage";
import VIPPage from "./pages/VIPPage";
import AffiliatePage from "./pages/AffiliatePage";
import PromotionsPage from "./pages/PromotionsPage";
import TournamentsPage from "./pages/TournamentsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProvablyFairPage from "./pages/ProvablyFairPage";
import HistoryPage from "./pages/HistoryPage";
import SupportPage from "./pages/SupportPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<CasinoLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/casino" element={<CasinoPage />} />
            <Route path="/originals" element={<OriginalsPage />} />
            <Route path="/slots" element={<SlotsPage />} />
            <Route path="/live" element={<LiveCasinoPage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/game/:slug" element={<GamePage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/vip" element={<VIPPage />} />
            <Route path="/affiliate" element={<AffiliatePage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/provably-fair" element={<ProvablyFairPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;