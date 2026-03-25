# Architecture Overview

## High-Level Flow

```
User Request
    ↓
Next.js App Router (Layout Groups)
    ↓
Page Component (Server/Client)
    ↓
API Service Layer (services/)
    ↓
Axios API Client (lib/api-client.ts)
    ↓
Backend API Routes (app/api/)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

## Folder Organization

### `/app` - Next.js App Router

Uses **layout groups** (folders in parentheses) for logical organization:

```
app/
├── layout.tsx                 # Root layout (global provider)
├── providers.tsx              # SessionProvider, contexts
├── (storefront)/              # Public storefront
│   ├── layout.tsx            # Header, footer
│   ├── page.tsx              # Home page
│   └── products/
│       └── page.tsx          # Product listing
├── (auth)/                    # Auth pages
│   ├── layout.tsx            # Centered login/register layout
│   ├── login/page.tsx
│   └── register/page.tsx
├── (admin)/                   # Admin dashboard (protected)
│   ├── layout.tsx            # Sidebar + navbar layout
│   ├── dashboard/page.tsx
│   ├── products/page.tsx
│   └── orders/page.tsx
└── api/                       # API endpoints
    ├── auth/[...nextauth]/route.ts
    ├── products/route.ts
    ├── orders/route.ts
    └── admin/
```

**Why Layout Groups?**
- Organize related pages without affecting URL structure
- Share layouts across multiple routes
- Keep code organized logically

### `/components` - React Components

Organized by feature/type:

```
components/
├── ui/                     # Base UI components (Button, Card, etc.)
├── forms/                  # Form components (LoginForm, ProductForm)
├── tables/                 # Data table components
├── navigation/             # Header, Navbar, Sidebar
├── sections/               # Large page sections
└── shared/                 # Shared utility components
```

### `/lib` - Core Utilities

```
lib/
├── auth.config.ts         # NextAuth configuration
├── db.ts                  # Prisma client singleton
├── api-client.ts          # Axios HTTP client
└── utils.ts               # Helper functions (cn, format, etc.)
```

**Prisma Client Pattern:** Singleton pattern to avoid multiple instances in development.

### `/services` - API Layer

Business logic and API calls organized by resource:

```typescript
// services/products.ts
export const productService = {
  getAll(),
  getById(),
  create(),
  update(),
  delete(),
  search(),
  getByCategory(),
};
```

**Benefits:**
- Centralized API logic
- Easy to mock for testing
- Reusable across components

### `/hooks` - Custom Hooks

```
hooks/
├── useAuth.ts            # Session & authentication
├── useCart.ts            # Shopping cart state (Zustand)
└── usePagination.ts      # Pagination logic
```

### `/types` - TypeScript Types

```
types/
├── index.ts             # Barrel export (all types)
├── api.ts               # API response types
├── user.ts              # User entity types
├── product.ts           # Product entity types
└── order.ts             # Order entity types
```

### `/utils` - Pure Utilities

```
utils/
├── validation.ts        # Zod schemas for form validation
├── formatting.ts        # Format functions (price, date)
├── constants.ts         # App constants & enums
└── api.ts               # API error handling
```

### `/themes` - Design Tokens

```
themes/
├── colors.ts            # Color palette, shadows, spacing
├── typography.ts        # Font sizes, weights, families
└── index.ts             # Barrel export
```

### `/prisma` - Database

```
prisma/
├── schema.prisma        # Database schema definition
├── seed.ts              # Seed script for sample data
└── migrations/          # Auto-generated migration files
```

## Data Flow Patterns

### Pattern 1: Server Component → Service → API

```tsx
// app/(storefront)/products/page.tsx
import { productService } from '@/services/products';

export default async function ProductsPage() {
  const products = await productService.getAll();
  return <ProductList products={products} />;
}
```

### Pattern 2: Client Component → Hook → Service → API

```tsx
// components/ProductCard.tsx
'use client';
import { useEffect, useState } from 'react';
import { productService } from '@/services/products';

export function ProductCard({ slug }: { slug: string }) {
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    productService.getBySlug(slug).then(setProduct);
  }, [slug]);
  
  return <div>{product?.name}</div>;
}
```

### Pattern 3: Form Submission → API Route → Database

```tsx
// components/forms/AddProductForm.tsx
'use client';
import { useFormState } from 'react-dom';
import { addProduct } from '@/app/api/products/actions';

export function AddProductForm() {
  const [state, formAction] = useFormState(addProduct, null);
  
  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit">Add Product</button>
    </form>
  );
}
```

## Authentication Flow

```
User → NextAuth → Credentials/OAuth Provider
                ↓
         Database lookup
                ↓
         JWT token generated
                ↓
      Session stored in request
                ↓
      useAuth() hook provides session
                ↓
   Components use session for auth state
                ↓
    Middleware protects admin routes
```

## State Management

### Session State (NextAuth)
- Managed by NextAuth
- Accessed via `useSession()` hook
- Includes user role for authorization

### Cart State (Zustand)
- Light, client-side store
- Persists in browser storage
- Accessed via `useCart()` hook

### Form State (React Hook Form)
- Component-level state
- Validation with Zod
- No global state needed

### Server State (Prisma/Database)
- Source of truth for data
- Accessed via API routes
- Cached in services layer if needed

## API Design

### Endpoints Structure

```
GET    /api/products              # List all products
POST   /api/products              # Create product (admin)
GET    /api/products/:id          # Get single product
PUT    /api/products/:id          # Update product (admin)
DELETE /api/products/:id          # Delete product (admin)

GET    /api/orders                # List user's orders
POST   /api/orders                # Create order
GET    /api/orders/:id            # Get order details
```

### Response Format

```json
{
  "success": true,
  "data": { /* ... */ },
  "message": "Optional message"
}
```

## Security Layers

1. **NextAuth Authentication** - Handles user sessions
2. **Middleware** - Protects admin routes
3. **API Route Guards** - Verify auth in each endpoint
4. **Database Roles** - Optional: enforce at DB level
5. **Input Validation** - Zod schemas validate all inputs
6. **CORS** - Configure if needed for cross-origin

## Performance Optimizations

### Server Components
- Fetch data serverside
- Reduce client bundle
- Direct database access

### Code Splitting
- Layout groups keep code organized
- Dynamic imports for heavy components
- Separate client bundles by route

### Caching
- Next.js caches server components
- Implement cache tags for revalidation
- Use Prisma relations strategically

### Database
- Proper indexing on schema
- Connection pooling with Prisma
- Query optimization

## Deployment Checklist

- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] NextAuth secret generated and set
- [ ] CORS configured if needed
- [ ] Image optimization enabled
- [ ] Error logging set up
- [ ] Database backups configured
- [ ] CI/CD pipeline established
