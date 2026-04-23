import { useState, ReactNode, useContext } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AppThemeContext } from '../../context/AppThemeContext';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const themeContext = useContext(AppThemeContext);
  const isDarkMode = themeContext?.isDarkMode ?? false;

  return (
    <div className={isDarkMode ? 'admin-theme-shell app-theme-dark min-h-screen bg-[#0d1117] text-[#c9d1d9]' : 'admin-theme-shell min-h-screen bg-gray-50'}>
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
      />
      <AdminHeader
        onMenuClick={() => setSidebarOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onDesktopToggle={() => setIsSidebarCollapsed((current) => !current)}
      />
      
      <main
        className={`admin-theme-content pt-16 transition-[padding-left] duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[5.5rem]' : 'lg:pl-64'
        }`}
      >
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
