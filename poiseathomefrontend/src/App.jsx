import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import Unauthorized from './pages/Unauthorized';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { GuestRoute, ProtectedRoute, RoleRoute } from './components/ProtectedRoute';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCategories from "./pages/admin/catalog/AdminCategories";
import AdminAppointments from "./pages/admin/appointments/AdminAppointments";
import AdminAppointmentDetail from "./pages/admin/appointments/AdminAppointmentDetail";
import AdminPayments from "./pages/admin/appointments/AdminPayments";
import AdminPaymentDetail from "./pages/admin/appointments/AdminPaymentDetail";
import AdminServices from "./pages/admin/catalog/AdminServices";
import AdminStaffList from './pages/admin/staff/AdminStaffList';
import AdminStaffDetail from './pages/admin/staff/AdminStaffDetail';
import AdminProductCategories from './pages/admin/catalog/AdminProductCategories';
import AdminProducts from './pages/admin/catalog/AdminProducts';
import AdminInventory from './pages/admin/catalog/AdminInventory';
import AdminInventoryDetail from './pages/admin/catalog/AdminInventoryDetail';

import StaffDashboard from './pages/staff/StaffDashboard';
import StaffAppointments from "./pages/staff/appointments/StaffAppointments";
import StaffAppointmentDetail from "./pages/staff/appointments/StaffAppointmentDetail";
import StaffServices from "./pages/staff/services/StaffServices";
import StaffAvailability from './pages/staff/availability/StaffAvailability';
import StaffInventory from './pages/staff/inventory/StaffInventory';

import AdminReports from "./pages/admin/reports/AdminReports";
import StaffReports from "./pages/staff/reports/StaffReports";
import ServiceCatalog from "./pages/catalog/ServiceCatalog";
import CustomerBooking from "./pages/book/CustomerBooking";
import ServiceDetail from "./pages/catalog/ServiceDetail";
import CustomerAppointments from "./pages/customer/appointments/CustomerAppointments";
import CustomerAppointmentDetail from "./pages/customer/appointments/CustomerAppointmentDetail";
import CustomerAccount from './pages/customer/CustomerAccount';
import CustomerAddress from './pages/customer/CustomerAddress';

import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import AccountProfile from './pages/AccountProfile';
import Reviews from './pages/Reviews';
import { AppDialogProvider } from './context/AppDialogContext';

function App() {
  return (
    <AuthProvider>
      <AppDialogProvider>
      <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ServiceCatalog />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/book" element={<RoleRoute allowedRoles={['customer']}><CustomerBooking /></RoleRoute>} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/verify-email" element={<GuestRoute><VerifyEmail /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Notifications Route */}
          <Route element={<ProtectedRoute />}>
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<AccountProfile />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
          <Route path="/admin/reports" element={<RoleRoute allowedRoles={['admin']}><AdminReports /></RoleRoute>} />
          <Route path="/admin/service-categories" element={<RoleRoute allowedRoles={['admin']}><AdminCategories /></RoleRoute>} />
          <Route path="/admin/services" element={<RoleRoute allowedRoles={['admin']}><AdminServices /></RoleRoute>} />
          <Route path="/admin/staff" element={<RoleRoute allowedRoles={['admin']}><AdminStaffList /></RoleRoute>} />
          <Route path="/admin/staff/:id" element={<RoleRoute allowedRoles={['admin']}><AdminStaffDetail /></RoleRoute>} />
          <Route path="/admin/appointments" element={<RoleRoute allowedRoles={['admin']}><AdminAppointments /></RoleRoute>} />
          <Route path="/admin/appointments/:id" element={<RoleRoute allowedRoles={['admin']}><AdminAppointmentDetail /></RoleRoute>} />
          <Route path="/admin/payments" element={<RoleRoute allowedRoles={['admin']}><AdminPayments /></RoleRoute>} />
          <Route path="/admin/payments/:id" element={<RoleRoute allowedRoles={['admin']}><AdminPaymentDetail /></RoleRoute>} />
          
          {/* Phase 6: Admin Inventory */}
          <Route path="/admin/product-categories" element={<RoleRoute allowedRoles={['admin']}><AdminProductCategories /></RoleRoute>} />
          <Route path="/admin/products" element={<RoleRoute allowedRoles={['admin']}><AdminProducts /></RoleRoute>} />
          <Route path="/admin/inventory" element={<RoleRoute allowedRoles={['admin']}><AdminInventory /></RoleRoute>} />
          <Route path="/admin/inventory/:id" element={<RoleRoute allowedRoles={['admin']}><AdminInventoryDetail /></RoleRoute>} />
          
          {/* Staff Routes */}
          <Route path="/staff" element={<RoleRoute allowedRoles={['staff']}><StaffDashboard /></RoleRoute>} />
          <Route path="/staff/reports" element={<RoleRoute allowedRoles={['staff']}><StaffReports /></RoleRoute>} />
          <Route path="/staff/profile" element={<RoleRoute allowedRoles={['staff']}><Navigate to="/profile" replace /></RoleRoute>} />
          <Route path="/staff/services" element={<RoleRoute allowedRoles={['staff']}><StaffServices /></RoleRoute>} />
          <Route path="/staff/availability" element={<RoleRoute allowedRoles={['staff']}><StaffAvailability /></RoleRoute>} />
          <Route path="/staff/appointments" element={<RoleRoute allowedRoles={['staff']}><StaffAppointments /></RoleRoute>} />
          <Route path="/staff/appointments/:id" element={<RoleRoute allowedRoles={['staff']}><StaffAppointmentDetail /></RoleRoute>} />
          <Route path="/staff/inventory" element={<RoleRoute allowedRoles={['staff']}><StaffInventory /></RoleRoute>} />
          
          {/* Customer Routes */}
          <Route path="/account" element={<RoleRoute allowedRoles={['customer']}><CustomerAccount /></RoleRoute>} />
          <Route path="/account/address" element={<RoleRoute allowedRoles={['customer']}><CustomerAddress /></RoleRoute>} />
          <Route path="/account/appointments" element={<RoleRoute allowedRoles={['customer']}><CustomerAppointments /></RoleRoute>} />
          <Route path="/account/appointments/:id" element={<RoleRoute allowedRoles={['customer']}><CustomerAppointmentDetail /></RoleRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </NotificationProvider>
    </AppDialogProvider>
    </AuthProvider>
  );
}

export default App;
