import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/auth/LoginPage";
import { OperatorKiosk } from "./pages/operator/OperatorKiosk";
import { SupervisorDashboard } from "./pages/supervisor/SupervisorDashboard";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import InitialSetup from "./pages/setup/InitialSetup";
import { SetupCheckProvider } from "@/hooks/useSetupCheck";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Protected route component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate page based on role
    const redirectPath = role === 'operator' ? '/operator' : role === 'admin' ? '/admin' : '/supervisor';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
}

// Auth redirect component - redirects authenticated users based on role
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  // IMPORTANT: don't block rendering the login page while auth is initializing.
  // If the user is already logged in, the redirect will happen as soon as the role is loaded.
  if (isLoading) {
    return <>{children}</>;
  }

  if (isAuthenticated && role) {
    const redirectPath = role === 'operator' ? '/operator' : role === 'admin' ? '/admin' : '/supervisor';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <SetupCheckProvider>
      <Routes>
        <Route path="/setup" element={<InitialSetup />} />
        
        <Route path="/login" element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        } />
      
      <Route path="/operator" element={
        <ProtectedRoute allowedRoles={['operator', 'supervisor', 'admin']}>
          <OperatorKiosk />
        </ProtectedRoute>
      } />
      
      <Route path="/supervisor" element={
        <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
          <SupervisorDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SetupCheckProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
