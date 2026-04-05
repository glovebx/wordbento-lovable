
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";

import Footer from "./components/Footer";
// import AppInitializer from "./AppInitializer";
// import AnalysisHistory from "./components/dashboard/AnalysisHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            <Route path="/" element={<Index />} />  
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
