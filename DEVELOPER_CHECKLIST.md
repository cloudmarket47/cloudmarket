# Developer Onboarding Checklist

## 🎯 Your First Session (30-60 minutes)

### Documentation Reading (15 min)
- [ ] Read `START_HERE.md` - overview of what's been done
- [ ] Read `README.md` - quick project overview
- [ ] Skim `QUICK_REFERENCE.md` - bookmark for later

### Environment Setup (15-30 min)
- [ ] Navigate to `c:\Users\USER\cloudmarket`
- [ ] Run `npm install` to install dependencies
- [ ] Create/edit `.env.local` with:
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/cloudmarket"
  NEXTAUTH_SECRET="your-secret-min-32-chars"
  NEXTAUTH_URL="http://localhost:3000"
  ```
- [ ] Verify PostgreSQL is running locally or accessible

### First Test (5 min)
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:3000` in browser
- [ ] See the CloudMarket homepage

---

## 🗄️ Database Setup (1-2 hours)

### Design Your Schema
- [ ] Read `SETUP_GUIDE.md` section on database models
- [ ] Plan your entity models:
  - [ ] User (accounts, roles)
  - [ ] Product (catalog, properties)
  - [ ] Category (product organization)
  - [ ] Order (transactions)
  - [ ] OrderItem (line items)
  - [ ] Add any domain-specific models

### Implement Schema
- [ ] Open `prisma/schema.prisma`
- [ ] Add your models (see examples in comments)
- [ ] Save file
- [ ] Run: `npm run prisma:migrate`
  - Create a migration name (e.g., "initial_schema")
  - Prisma generates SQL and updates database

### Verify Setup
- [ ] Run: `npm run prisma:studio`
  - Opens Prisma Studio GUI
  - Verify database tables were created
  - Can see schema visually

---

## 🏗️ Learn the Architecture (30 min)

### Understand the Flow
- [ ] Read `ARCHITECTURE.md` section "High-Level Flow"
- [ ] Read "Data Flow Patterns" section
- [ ] Understand:
  - [ ] Layout groups in App Router
  - [ ] Service layer pattern
  - [ ] API route -> Service -> Component flow

### Explore Key Files
- [ ] Check `lib/auth.config.ts` - authentication setup
- [ ] Check `app/layout.tsx` - root layout with providers
- [ ] Check `app/(storefront)/page.tsx` - simple page example
- [ ] Check `services/products.ts` - API service pattern
- [ ] Check `hooks/useAuth.ts` - hook pattern

---

## 🚀 Create Your First Feature (2-4 hours)

### Feature: Product Listing

#### Step 1: Create Database Model
- [ ] Add Product model to `prisma/schema.prisma`:
  ```prisma
  model Product {
    id    String @id @default(cuid())
    name  String
    slug  String @unique
    price Float
    // Add more fields as needed
    createdAt DateTime @default(now())
  }
  ```
- [ ] Run: `npm run prisma:migrate`

#### Step 2: Create API Endpoint
- [ ] Create `app/api/products/[id]/route.ts`
- [ ] Add GET route to fetch product:
  ```typescript
  export async function GET(req: NextRequest) {
    // Add fetching logic with Prisma
  }
  ```
- [ ] Test with curl or Postman

#### Step 3: Create Service Method
- [ ] Update `services/products.ts`
- [ ] Add method to fetch product
- [ ] Use `apiClient.get()` to call your API

#### Step 4: Create Component
- [ ] Create `components/ProductCard.tsx`
- [ ] Accept product as prop
- [ ] Display product details
- [ ] Use Tailwind CSS for styling

#### Step 5: Create Page
- [ ] Create `app/(storefront)/products/[slug]/page.tsx`
- [ ] Fetch product using service
- [ ] Import and render ProductCard
- [ ] Handle loading/error states

#### Step 6: Test
- [ ] Stop dev server (Ctrl+C)
- [ ] Run: `npm run dev`
- [ ] Visit `/products/[slug]` in browser
- [ ] Verify product displays correctly

---

## 📝 Development Workflow

### Before Each Coding Session
- [ ] Run `npm run type-check` - check TypeScript
- [ ] Run `npm run lint` - check code quality
- [ ] Tests pass (if you add tests)

### While Coding
- [ ] Keep TypeScript strict enabled
- [ ] Use path aliases (`@/...`) not relative paths
- [ ] Add types for all function parameters
- [ ] Use `'use client'` only when needed

### After Each Feature
- [ ] Type-check passes: `npm run type-check`
- [ ] No ESLint errors: `npm run lint`
- [ ] Manually test in browser
- [ ] Test happy path + error cases
- [ ] Commit to git with clear message

---

## 🎨 Component Development

### Creating a New Component

#### Step 1: Choose Location
- [ ] `components/ui/` - Base UI (Button, Card, etc.)
- [ ] `components/forms/` - Form components
- [ ] `components/sections/` - Page sections
- [ ] `components/shared/` - Utility components

#### Step 2: Write Component
- [ ] Create file: `components/[folder]/ComponentName.tsx`
- [ ] All props should be typed:
  ```typescript
  interface ComponentProps {
    title: string;
    onClick?: (id: string) => void;
  }
  
  export function Component({ title, onClick }: ComponentProps) {
    // Component code
  }
  ```
- [ ] Use Tailwind CSS for styling
- [ ] Follow existing patterns

#### Step 3: Export if Reusable
- [ ] For common components, add to `components/ui/index.ts`
- [ ] Then import: `import { Component } from '@/components/ui'`

---

## 🔧 Common Tasks

### Adding a New API Endpoint

1. Create `app/api/feature/route.ts`
2. Implement GET, POST, etc:
   ```typescript
   import { auth } from '@/auth';
   
   export async function GET(req: NextRequest) {
     const session = await auth();
     if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     
     // Your logic here
     return NextResponse.json({ data: [] });
   }
   ```
3. Create service in `services/feature.ts`
4. Call from components via service

### Adding Form Validation

1. Add schema to `utils/validation.ts`:
   ```typescript
   export const myFormSchema = z.object({
     field: z.string().min(1),
   });
   export type MyFormInput = z.infer<typeof myFormSchema>;
   ```
2. Use in component:
   ```typescript
   const { register, handleSubmit } = useForm<MyFormInput>({
     resolver: zodResolver(myFormSchema),
   });
   ```

### Adding Utility Function

1. Add to `utils` folder (validation, formatting, api, constants)
2. Implement with TypeScript:
   ```typescript
   export function myUtility(input: string): string {
     return input.toUpperCase();
   }
   ```
3. Export and import with path alias: `import { myUtility } from '@/utils'`

### Formatting Data

Use provided utilities:
```typescript
import { 
  formatPrice,      // "$10.00"
  formatDate,       // "Jan 1, 2026"
  slugify,          // "hello-world"
  truncate,         // "Hello..."
} from '@/utils/formatting';
```

---

## 🐛 Debugging

### TypeScript Errors
```bash
npm run type-check
```

### ESLint Errors
```bash
npm run lint
```

### Database Issues
```bash
# Open database GUI
npm run prisma:studio

# Regenerate client after schema changes
npm run prisma:generate
```

### Authentication Issues
- Check `.env.local` has NEXTAUTH_SECRET and NEXTAUTH_URL
- Check auth.ts has correct handlers export
- Check middleware.ts has correct matchers

### API Not Working
- Check route is in `app/api/` folder
- Check function is exported (GET, POST, etc)
- Check auth middleware isn't blocking
- Test with curl: `curl http://localhost:3000/api/endpoint`

---

## 📚 Learning Resources

As you build, refer to:

- **Architecture**: `ARCHITECTURE.md` - system design
- **Quick Reference**: `QUICK_REFERENCE.md` - common patterns
- **Setup Info**: `SETUP_GUIDE.md` - environment & commands
- **File Guide**: `FILE_MANIFEST.md` - what file is where

---

## ✅ Quality Checklist for Each Feature

- [ ] All functions have TypeScript types
- [ ] No `any` types used
- [ ] All API endpoints have auth checks
- [ ] Form inputs validated with Zod
- [ ] Error handling implemented
- [ ] No console.log in production code
- [ ] Components are reusable
- [ ] Proper use of `'use client'` directive
- [ ] Server components for data fetching
- [ ] Client components for interactivity

---

## 🚀 Ready to Ship

When feature is complete:

- [ ] Type-check: `npm run type-check` passes
- [ ] Lint: `npm run lint` passes
- [ ] Manual testing complete
- [ ] Error cases handled
- [ ] Commit to git
- [ ] Push to repository

---

## 📞 When Stuck

1. Check documentation files first (especially QUICK_REFERENCE.md)
2. Review similar code in the project
3. Check official docs:
   - Next.js: https://nextjs.org/docs
   - Prisma: https://www.prisma.io/docs
   - React: https://react.dev
   - TypeScript: https://www.typescriptlang.org/docs

---

## 🎊 You're Ready!

You have:
- ✅ Complete project setup
- ✅ Production architecture
- ✅ All tools configured
- ✅ Comprehensive documentation
- ✅ Clear patterns to follow

**Start with your database schema design, then build your first feature!**

Good luck! 🚀
