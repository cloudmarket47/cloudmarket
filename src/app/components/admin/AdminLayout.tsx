import { useState, ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
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
        className={`pt-16 transition-[padding-left] duration-300 ${
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
