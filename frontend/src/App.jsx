import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { TranslationProvider } from "./hooks/useTranslation";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { DiscoveryPage } from "./pages/DiscoveryPage";
import { SignInPage } from "./pages/SignInPage";
import { ManagerSignupPage } from "./pages/ManagerSignupPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ManagerOnboardingPage } from "./pages/ManagerOnboardingPage";
import { ManagerDashboardPage } from "./pages/ManagerDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

export default function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DiscoveryPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/manager/signup" element={<ManagerSignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route
              path="/manager/onboarding"
              element={
                <ProtectedRoute role="manager">
                  <ManagerOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute role="manager">
                  <ManagerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TranslationProvider>
  );
}
