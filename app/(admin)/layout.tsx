/**
 * Admin layout
 * Layout for admin/dashboard pages (protected)
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted p-6">
        <h2 className="text-lg font-bold mb-6">Admin</h2>
        <nav className="space-y-2 text-sm">
          <a href="/admin/dashboard" className="block px-3 py-2 rounded hover:bg-muted-foreground/10">
            Dashboard
          </a>
          <a href="/admin/products" className="block px-3 py-2 rounded hover:bg-muted-foreground/10">
            Products
          </a>
          <a href="/admin/orders" className="block px-3 py-2 rounded hover:bg-muted-foreground/10">
            Orders
          </a>
          <a href="/admin/settings" className="block px-3 py-2 rounded hover:bg-muted-foreground/10">
            Settings
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="border-b px-6 h-16 flex items-center">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
