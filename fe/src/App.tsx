/**
 * Archivo: App.tsx
 * Descripción: Componente raíz — define el enrutamiento de la aplicación.
 * ¿Para qué? Centralizar TODAS las rutas en un solo lugar facilita entender
 *   la estructura de navegación del sistema de un vistazo.
 * ¿Impacto? Una ruta mal configurada puede hacer que una página sea inaccesible
 *   o que una ruta protegida quede expuesta sin autenticación o al rol equivocado.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AuthModalProvider } from '@/context/AuthModalProvider';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { PricingInfoPage } from '@/pages/PricingInfoPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { ClientHomePage } from '@/pages/client/ClientHomePage';
import { AppointmentPage } from '@/pages/client/AppointmentPage';
import { SymptomReportPage } from '@/pages/client/SymptomReportPage';
import { EmergencyPage } from '@/pages/client/EmergencyPage';
import { ShopPage } from '@/pages/client/ShopPage';
import { StaffHomePage } from '@/pages/staff/StaffHomePage';
import { StaffAgendaPage } from '@/pages/staff/StaffAgendaPage';
import { StaffPetsPage } from '@/pages/staff/StaffPetsPage';
import { StaffSymptomsPage } from '@/pages/staff/StaffSymptomsPage';
import { StaffServicesPage } from '@/pages/staff/StaffServicesPage';
import { StaffPricingPage } from '@/pages/staff/StaffPricingPage';
import { StaffProductsPage } from '@/pages/staff/StaffProductsPage';
import { StaffOrdersPage } from '@/pages/staff/StaffOrdersPage';
import { StaffSuppliersPage } from '@/pages/staff/StaffSuppliersPage';
import { StaffSupplierOrdersPage } from '@/pages/staff/StaffSupplierOrdersPage';
import { StaffSalesPage } from '@/pages/staff/StaffSalesPage';
import { StaffSalesReportPage } from '@/pages/staff/StaffSalesReportPage';
import { StaffCreateAccountPage } from '@/pages/staff/StaffCreateAccountPage';
import { StaffEmergencyPage } from '@/pages/staff/StaffEmergencyPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthModalProvider>
        <Routes>
          {/* ─── Rutas públicas — accesibles sin autenticación ─── */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/login" element={<Layout><LoginPage /></Layout>} />
          <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
          <Route path="/forgot-password" element={<Layout><ForgotPasswordPage /></Layout>} />
          <Route path="/reset-password" element={<Layout><ResetPasswordPage /></Layout>} />
          <Route path="/verify-email" element={<Layout><VerifyEmailPage /></Layout>} />
          <Route path="/precios" element={<Layout><PricingInfoPage /></Layout>} />
          <Route path="/terminos" element={<Layout><TermsPage /></Layout>} />
          <Route path="/privacidad" element={<Layout><PrivacyPage /></Layout>} />

          {/* ─── Zona del cliente — solo role: client ─── */}
          <Route
            path="/app"
            element={
              <ProtectedRoute role="client">
                <Layout><ClientHomePage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cita"
            element={
              <ProtectedRoute role="client">
                <Layout><AppointmentPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/sintoma"
            element={
              <ProtectedRoute role="client">
                <Layout><SymptomReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/emergencia"
            element={
              <ProtectedRoute role="client">
                <Layout><EmergencyPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/tienda"
            element={
              <ProtectedRoute role="client">
                <Layout><ShopPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* ─── Zona del staff — solo role: staff ─── */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffHomePage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/agenda"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffAgendaPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/mascotas"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffPetsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/sintomas"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffSymptomsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/servicios"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffServicesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/tarifario"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffPricingPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/productos"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffProductsPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/pedidos"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffOrdersPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/proveedores"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffSuppliersPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/pedidos-proveedor"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffSupplierOrdersPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/ventas"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffSalesPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/reporte-ventas"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffSalesReportPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/nueva-cuenta"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffCreateAccountPage /></Layout>
              </ProtectedRoute>
            }
          />
          {/* ¿Qué? Configurar emergencia (HU-011, CA-011.4). */}
          <Route
            path="/staff/emergencia"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffEmergencyPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* ─── Común a ambos roles ─── */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <Layout><ChangePasswordPage /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <Layout>
                <div className="min-h-[60vh] flex items-center justify-center">
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    404 — Página no encontrada
                  </p>
                </div>
              </Layout>
            }
          />
        </Routes>
        </AuthModalProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
