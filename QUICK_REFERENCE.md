# Quick Reference Guide

## Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Setup PostgreSQL & .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# 3. Setup database
npm run prisma:migrate

# 4. Start development server
npm run dev

# Visit http://localhost:3000
```

---

## Project Structure at a Glance

```
📦 /app                 Next.js App Router
  📂 (storefront)/     Public pages
  📂 (auth)/           Login/Register
  📂 (admin)/          Admin Dashboard
  📂 api/              API endpoints

📦 /components          React Components
  📂 ui/               Base UI components
  📂 forms/            Form components
  📂 tables/           Tables
  📂 navigation/       Nav components
  
📦 /lib                Core Utilities
  📄 auth.config.ts    NextAuth setup
  📄 db.ts             Prisma client
  📄 api-client.ts     Axios instance

📦 /services           API Methods
  📄 products.ts
  📄 orders.ts
  📄 users.ts

📦 /hooks              Custom Hooks
  📄 useAuth.ts
  📄 useCart.ts
  📄 usePagination.ts

📦 /types              TypeScript Types
  📄 index.ts          (main export)
  📄 api.ts
  📄 user.ts
  📄 product.ts
  📄 order.ts

📦 /utils              Utilities
  📄 validation.ts     Zod schemas
  📄 formatting.ts     Format functions
  📄 constants.ts      App constants

📦 /themes             Design Tokens
  📄 colors.ts
  📄 typography.ts

📦 /prisma             Database
  📄 schema.prisma     Database schema
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `auth.ts` | NextAuth configuration & handlers |
| `middleware.ts` | Route protection & redirects |
| `lib/auth.config.ts` | NextAuth strategy setup |
| `lib/db.ts` | Prisma client singleton |
| `lib/api-client.ts` | Axios HTTP client |
| `.env.local` | Environment variables |
| `prisma/schema.prisma` | Database schema |
| `tailwind.config.ts` | Tailwind configuration |

---

## Common Tasks

### Add a New API Endpoint

1. Create file: `app/api/feature/route.ts`
2. Add `GET/POST/PUT/DELETE` functions
3. Check authentication with `await auth()`
4. Return `NextResponse.json()`

```typescript
// Example
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // TODO: Add logic
  return NextResponse.json({ data: [] });
}
```

### Add a Service Method

1. Create/edit: `services/feature.ts`
2. Add method to export object
3. Use `apiClient.get/post/put/delete()`

```typescript
// Example
export const featureService = {
  async getAll() {
    return apiClient.get('/feature');
  },
};
```

### Create a Page

1. Create folder: `app/(layout)/page-name/`
2. Add `page.tsx`
3. Use `export default function PageName() { ... }`

```typescript
// Example: /app/(storefront)/products/page.tsx
export default function ProductsPage() {
  return <div>Products</div>;
}
```

### Add Database Model

1. Edit: `prisma/schema.prisma`
2. Define your model
3. Run: `npm run prisma:migrate`

```prisma
// Example
model Product {
  id    String  @id @default(cuid())
  name  String
  price Float
  stock Int
}
```

### Format Strings and Numbers

```typescript
import { 
  formatPrice,      // "$10.00"
  formatDate,       // "Jan 1, 2026"
  slugify,          // "hello-world"
  truncate,         // "Hello..."
} from '@/utils/formatting';
```

### Use Custom Hooks

```typescript
'use client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';

export function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  const { items, addItem } = useCart();
  // ...
}
```

### Validate Forms

```typescript
import { loginSchema, LoginInput } from '@/utils/validation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

---

## Command Reference

```bash
# Development
npm run dev              # Start dev server
npm run type-check      # Check TypeScript
npm run lint            # Run ESLint

# Build & Deploy
npm run build           # Production build
npm start               # Run production server

# Database
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Create & run migration
npm run prisma:studio   # Open GUI for DB
npm run prisma:seed     # Run seed script
```

---

## Environment Variables

**Required:**
```env
DATABASE_URL="postgresql://user:password@localhost/dbname"
NEXTAUTH_SECRET="min-32-characters-long-secret"
NEXTAUTH_URL="http://localhost:3000"
```

**Optional:**
```env
# OAuth
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."

# Payments
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# Storage
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

---

## Layout Groups Explained

Next.js layout groups let you organize routes without changing URLs:

```
(storefront) - /products, /          → Storefront layout
(auth)       - /login, /register      → Auth layout
(admin)      - /admin/products, ...   → Admin layout with sidebar
```

The parentheses don't appear in the URL!

---

## Authentication Flow

1. User navigates to `/login`
2. Submits email + password
3. `signIn('credentials', ...)` calls NextAuth
4. NextAuth validates against database
5. JWT token created
6. Session stored in request
7. `useAuth()` hook reads session
8. Components check `isAuthenticated`

---

## API Response Format

```json
{
  "success": true,
  "data": { /* resource object */ },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## TypeScript Paths

Use these aliases instead of relative paths:

```typescript
// ❌ Don't do this
import { useAuth } from '../../../hooks/useAuth';

// ✅ Do this
import { useAuth } from '@/hooks/useAuth';
```

All aliases defined in `tsconfig.json`.

---

## Need Help?

- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth**: https://next-auth.js.org
- **Tailwind**: https://tailwindcss.com/docs
- **React Hook Form**: https://react-hook-form.com

---

**🚀 You're all set! Start building!**
