import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntroAnimation from "@/components/IntroAnimation";
import Navbar from "@/components/Navbar";
import AIChatTutor from "@/components/AIChatTutor";
import Index from "./pages/Index";
import FormulasPage from "./pages/FormulasPage";
import GraphPage from "./pages/GraphPage";
import TestPage from "./pages/TestPage";
import HistoryPage from "./pages/HistoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [replayIntro, setReplayIntro] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setReplayIntro(false);
  }, []);

  const handleLogoClick = () => {
    setReplayIntro(true);
    setShowIntro(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
        <BrowserRouter>
          <Navbar onLogoClick={handleLogoClick} />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/formulas" element={<FormulasPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatTutor />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
