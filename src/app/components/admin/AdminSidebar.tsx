import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  BarChart3, 
  Wallet,
  Settings,
  Store,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBrandingSettings } from '../../lib/branding';
import { getOptimizedMedia } from '../../lib/media';
import { useAppTheme } from '../../context/AppThemeContext';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

const navigationItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
  { icon: Users, label: 'Subscribers', href: '/admin/subscribers' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Wallet, label: 'Finance', href: '/admin/finance' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' }
];

export function AdminSidebar({ isOpen, onClose, isCollapsed }: AdminSidebarProps) {
  const location = useLocation();
  const branding = useBrandingSettings();
  const { isDarkMode } = useAppTheme();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 transition-[width,transform] duration-300',
          isDarkMode
            ? 'border-r border-white/10 bg-[#0f141b] text-[#e6edf3]'
            : 'border-r border-gray-200 bg-white',
          isCollapsed ? 'lg:w-[5.5rem]' : 'lg:w-64',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo/Header */}
        <div
          className={cn(
            'flex h-16 items-center',
            isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-200',
            isCollapsed ? 'px-6 lg:px-3' : 'px-6'
          )}
        >
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-2',
              isCollapsed ? 'w-full lg:justify-center' : ''
            )}
            title="Admin dashboard"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF]">
              {branding.logoUrl ? (
                <img
                  src={getOptimizedMedia(branding.logoUrl)}
                  alt={`${branding.companyName} logo`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-5 w-5 text-white" />
              )}
            </div>
            {isCollapsed ? (
              <span className={cn('ml-2 text-lg font-bold lg:hidden', isDarkMode ? 'text-white' : 'text-gray-900')}>
                {branding.companyName}
              </span>
            ) : (
              <span className={cn('ml-2 text-lg font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                {branding.companyName}
              </span>
            )}
          </Link>
          <button
            onClick={onClose}
            className={cn(
              'ml-auto rounded-lg p-2 lg:hidden',
              isDarkMode ? 'hover:bg-white/8 text-slate-200' : 'hover:bg-gray-100'
            )}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href !== '/admin' && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex rounded-xl py-3 transition-all',
                  isCollapsed ? 'items-center gap-3 px-4 lg:justify-center lg:px-3' : 'items-center gap-3 px-4',
                  isActive 
                    ? 'bg-[#0E7C7B] text-white shadow-sm' 
                    : isDarkMode
                      ? 'text-slate-300 hover:bg-white/6'
                      : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                {isCollapsed ? (
                  <span className="font-medium lg:hidden">{item.label}</span>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* View Storefront Link */}
        <div className={cn('absolute bottom-0 left-0 right-0 border-t p-4', isDarkMode ? 'border-white/10' : 'border-gray-200')}>
          <Link
            to="/"
            title={isCollapsed ? 'View Storefront' : undefined}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all',
              isDarkMode
                ? 'bg-[#161b22] text-slate-200 hover:bg-[#1b2330]'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            )}
          >
            <Store className="w-5 h-5" />
            {isCollapsed ? <span className="lg:hidden">View Storefront</span> : <span>View Storefront</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
