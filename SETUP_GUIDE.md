# Setup Guide - eCommerce Sales OS

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Git

### 1. Environment Setup

Create a \`.env.local\` file with the following:

\`\`\`env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/cloudmarket"

# NextAuth Configuration
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
\`\`\`

To generate a secure NEXTAUTH_SECRET:
\`\`\`bash
openssl rand -base64 32
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Database Setup

\`\`\`bash
# Generate Prisma client
npm run prisma:generate

# Create database tables (creates new migration)
npm run prisma:migrate

# Optional: Seed with sample data
npm run prisma:seed
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Server runs at \`http://localhost:3000\`

## Project Structure Overview

| Folder | Purpose |
|--------|---------|
| \`app/\` | Next.js App Router with layout groups |
| \`components/\` | React components (UI, Forms, Tables) |
| \`lib/\` | Core configuration (Auth, DB, API client) |
| \`services/\` | API service layer methods |
| \`hooks/\` | Custom React hooks (useAuth, useCart) |
| \`types/\` | TypeScript type definitions |
| \`utils/\` | Utility functions (validation, formatting) |
| \`themes/\` | Design tokens (colors, typography) |
| \`prisma/\` | Database schema and migrations |
| \`styles/\` | Global CSS and Tailwind config |

## Layout Groups

The app uses Next.js layout groups (folders with parentheses):

- \`(storefront)\` - Public customer pages (no special layout)
- \`(auth)\` - Login/register with centered layout
- \`(admin)\` - Admin dashboard with sidebar (protected)

## Authentication

NextAuth is configured with:

- **Providers**: Credentials, GitHub, Google
- **Session**: JWT-based
- **Protected Routes**: /admin/* routes require admin role

Create a user and assign roles in the database.

## API Routes

Standard RESTful API structure:

- \`/api/products\` - Product CRUD
- \`/api/orders\` - Order CRUD  
- \`/api/users\` - User management
- \`/api/auth/[...nextauth]\` - NextAuth endpoints

All protected routes verify authentication via nextAuth session.

## Database Schema (Prisma)

Add models to \`prisma/schema.prisma\`:

\`\`\`prisma
model User {
  id    String     @id @default(cuid())
  email String     @unique
  name  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id   String @id @default(cuid())
  name String
  // ... other fields
}
\`\`\`

Run migrations after schema changes:
\`\`\`bash
npm run prisma:migrate
\`\`\`

## Development Tips

### Add a New Feature

1. **Define types** in \`types/feature.ts\`
2. **Create service** in \`services/feature.ts\`
3. **Build API endpoint** in \`app/api/feature/route.ts\`
4. **Create components** in \`components/feature/\`
5. **Add pages** in appropriate layout group

### Using Hooks in Components

\`\`\`tsx
'use client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';

export function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  const { items, total } = useCart();
  // ...
}
\`\`\`

### Form Validation

Use React Hook Form + Zod:

\`\`\`tsx
import { LoginInput, loginSchema } from '@/utils/validation';

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
\`\`\`

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env.local
- Ensure database exists: \`createdb cloudmarket\`

### NextAuth Issues
- NEXTAUTH_SECRET must be min 32 characters
- NEXTAUTH_URL must match your environment
- Check auth.ts file exports correct handlers

### Port Already in Use
\`\`\`bash
# Change port in package.json dev script
"dev": "next dev -p 3001"
\`\`\`

## Production Deployment

### Environment Variables
Update for production:
- \`NEXTAUTH_URL\` - Your production domain
- \`NEXTAUTH_SECRET\` - New secure secret (min 32 chars)
- \`DATABASE_URL\` - Production database URL

### Build
\`\`\`bash
npm run build
npm start
\`\`\`

### Deployment Options
- **Vercel** (recommended for Next.js)
- **AWS** (EC2, ECS, Lambda)
- **DigitalOcean**
- **Heroku**
- **Self-hosted** (VPS)

## Useful Commands

\`\`\`bash
# Development
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Prisma commands
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Create migration
npm run prisma:studio      # Open Prisma Studio GUI
npm run prisma:seed        # Run seed script
\`\`\`

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
