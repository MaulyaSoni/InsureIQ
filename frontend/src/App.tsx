import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Policies from "./pages/Policies";
import PolicyDetails from "./pages/PolicyDetails";
import RiskAssessment from "./pages/RiskAssessment";
import ClaimPrediction from "./pages/ClaimPrediction";
import PremiumAdvisory from "./pages/PremiumAdvisory";
import Reports from "./pages/Reports";
import BatchAnalysis from "./pages/BatchAnalysis";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Workbench from "./pages/Workbench";
import FraudReview from "./pages/FraudReview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/policies" element={<Policies />} />
                    <Route path="/policies/:id" element={<PolicyDetails />} />
                    <Route path="/risk-assessment" element={<RiskAssessment />} />
                    <Route path="/claim-prediction" element={<ClaimPrediction />} />
                    <Route path="/premium-advisory" element={<PremiumAdvisory />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/batch-analysis" element={<BatchAnalysis />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/workbench" element={<Workbench />} />
                    <Route path="/fraud-review" element={<FraudReview />} />
                    <Route path="/audit-log" element={<AuditLog />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
