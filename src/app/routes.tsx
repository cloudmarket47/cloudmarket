import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ScrollToTopLayout } from './components/ScrollToTopLayout';
import { hasAdminAccess } from './lib/adminAccess';

// Admin Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Products } from './pages/admin/Products';
import { ProductBuilder } from './pages/admin/ProductBuilder';
import { Orders } from './pages/admin/Orders';
import { Subscribers } from './pages/admin/Subscribers';
import { Analytics } from './pages/admin/Analytics';
import { FinanceDashboard } from './pages/admin/FinanceDashboard';
import { Settings } from './pages/admin/Settings';

// Storefront Pages
import { Marketplace } from './pages/storefront/Marketplace';
import { ProductPage } from './pages/storefront/ProductPage';
import { ThankYou } from './pages/storefront/ThankYou';

function AdminAccessRoute({ children }: { children: ReactNode }) {
  if (!hasAdminAccess()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    element: <ScrollToTopLayout />,
    children: [
      // Storefront Routes
      {
        path: '/',
        element: <Marketplace />
      },
      {
        path: '/product/:slug',
        element: <ProductPage />
      },
      {
        path: '/thank-you',
        element: <ThankYou />
      },

      // Admin Routes
      {
        path: '/admin',
        element: <AdminAccessRoute><AdminLayout><Dashboard /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/products',
        element: <AdminAccessRoute><AdminLayout><Products /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/products/create',
        element: <AdminAccessRoute><AdminLayout><ProductBuilder /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/products/:id/edit',
        element: <AdminAccessRoute><AdminLayout><ProductBuilder /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/orders',
        element: <AdminAccessRoute><AdminLayout><Orders /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/subscribers',
        element: <AdminAccessRoute><AdminLayout><Subscribers /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/analytics',
        element: <AdminAccessRoute><AdminLayout><Analytics /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/finance',
        element: <AdminAccessRoute><AdminLayout><FinanceDashboard /></AdminLayout></AdminAccessRoute>
      },
      {
        path: '/admin/expenses',
        element: <Navigate to="/admin/finance" replace />
      },
      {
        path: '/admin/settings',
        element: <AdminAccessRoute><AdminLayout><Settings /></AdminLayout></AdminAccessRoute>
      },

      // 404 Catch-all
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
