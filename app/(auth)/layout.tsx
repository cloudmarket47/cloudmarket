/**
 * Auth layout
 * Layout for authentication pages (login, register, etc.)
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
