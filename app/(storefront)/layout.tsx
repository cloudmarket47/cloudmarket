/**
 * Storefront layout
 * Public-facing layout for customer-facing pages
 */

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <nav className="container mx-auto px-4 h-16 flex items-center">
          <div className="text-xl font-bold">CloudMarket</div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted py-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © 2026 CloudMarket. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
