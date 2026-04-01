import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Analyzer from "./pages/Analyzer";
import ApiDocs from "./pages/ApiDocs";
import Pricing from "./pages/Pricing";
import PharmacyBilling from "./pages/PharmacyBilling";
import PrescriptionScanner from "./pages/PrescriptionScanner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/scan" element={<PrescriptionScanner />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/billing" element={<PharmacyBilling />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
