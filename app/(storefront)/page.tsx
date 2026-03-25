export default function StorefrontPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to CloudMarket</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Production-ready eCommerce Sales OS
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/products"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Browse Products
          </a>
          <a
            href="/login"
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
