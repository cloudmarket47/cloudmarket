# CloudMarket - eCommerce Sales OS

Production-ready eCommerce platform built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your database URL and secrets

# Set up database
npm run prisma:migrate

# Run development server
npm run dev
```

Visit `http://localhost:3000`

## Architecture

### Folder Structure

- **`app/`** - Next.js App Router with layout groups
  - `(storefront)/` - Public customer pages
  - `(auth)/` - Login/register pages
  - `(admin)/` - Admin dashboard (protected)
  - `api/` - API endpoints

- **`components/`** - Reusable React components
- **`lib/`** - Core utilities (auth, db, api client)
- **`services/`** - API service layer
- **`hooks/`** - Custom React hooks
- **`types/`** - TypeScript type definitions
- **`utils/`** - Helper functions
- **`themes/`** - Design tokens
- **`prisma/`** - Database schema

### Key Features

✅ Next.js 15 App Router  
✅ TypeScript for type safety  
✅ NextAuth.js authentication  
✅ Prisma ORM with PostgreSQL  
✅ Tailwind CSS styling  
✅ Zustand state management  
✅ React Hook Form validation  
✅ Scalable folder structure  
✅ API route protection  
✅ Admin dashboard layout  

## Environment Setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

**Minimal .env.local:**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cloudmarket"
NEXTAUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

## Development

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Database commands
npm run prisma:migrate    # Create migration
npm run prisma:studio     # Open Prisma Studio
npm run prisma:seed       # Seed data
```

## API Endpoints

- `GET/POST /api/products` - Product management
- `GET/POST /api/orders` - Order management  
- `GET/POST /api/users` - User management
- `POST /api/auth/signin` - NextAuth signin

All endpoints require authentication except public pages.

## Next Steps

1. **Define database schema** in `prisma/schema.prisma`
2. **Create migrations** with `npm run prisma:migrate`
3. **Build API endpoints** in `app/api/`
4. **Create service methods** in `services/`
5. **Build UI components** in `components/`
6. **Add pages** in layout groups

## Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)
  