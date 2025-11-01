# Couplefy

A Progressive Web App (PWA) for couples/groups to manage their finances together. Track personal and shared expenses and savings with beautiful visualizations.

## Features

- **Authentication**: Google OAuth via Supabase Auth
- **Expense Tracking**: Track personal and shared expenses with custom categories
- **Savings Tracking**: Monitor personal and shared savings goals
- **Category Management**: Create custom categories with colors for organizing transactions
- **Group/Couple Management**: Create groups, invite partners, and share financial data
- **Visualizations**: Beautiful charts showing spending patterns and category breakdowns
- **Monthly Filtering**: View transactions by month with easy navigation
- **PWA Support**: Install as a mobile/desktop app for offline access

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL (Docker)
- **ORM**: Drizzle ORM
- **Authentication**: Supabase Auth
- **Charts**: Chart.js with react-chartjs-2
- **PWA**: Serwist

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop
- Supabase account
- Google OAuth credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with:
   ```env
   DATABASE_URL=postgresql://couplefy_user:couplefy_password@localhost:5432/couplefy_db
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SECRET_KEY=your_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```

5. Push database schema:
   ```bash
   npm run db:push
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see your app!

## Database Management

- **Push schema**: `npm run db:push`
- **Generate migrations**: `npm run db:generate`
- **Run migrations**: `npm run db:migrate`
- **Database studio**: `npm run db:studio`

## Project Structure

```
couplefy/
├── app/
│   ├── auth/              # Authentication routes
│   ├── dashboard/         # Main app pages
│   │   ├── expenses/      # Expense tracking
│   │   ├── savings/       # Savings tracking
│   │   └── actions/       # Server actions
│   ├── sw.ts             # Service worker
│   └── layout.tsx        # Root layout
├── components/
│   ├── auth/             # Auth components
│   ├── categories/       # Category management
│   ├── charts/           # Chart components
│   ├── expenses/         # Expense components
│   ├── filters/          # Filter components
│   ├── groups/           # Group management
│   ├── pwa/              # PWA lifecycle
│   ├── savings/          # Savings components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── db/               # Database & schema
│   └── supabase/         # Supabase clients
└── public/
    ├── manifest.json     # PWA manifest
    └── icons/            # App icons
```

## Key Features Explained

### Expenses & Savings

- Add transactions with amount, category, date, and description
- Choose between personal or shared with your couple
- View category breakdown charts
- Compare personal vs shared spending

### Categories

- Create custom categories for expenses or savings
- Choose from 8 preset colors
- Categories can be used for both expense and saving tracking

### Couples/Groups

- Create a couple group
- Generate 7-day expiring invite codes
- Share financial data with your partner
- View all group members

### Monthly Filtering

- Navigate between months using arrow buttons
- Quick "Today" button to return to current month
- All charts and totals update based on selected month

### PWA Features

- Installable on mobile and desktop
- Offline support via service worker
- App-like experience with custom icons
- Pink/purple gradient branding

## Building for Production

```bash
npm run build
npm start
```

The PWA service worker will be automatically generated during the build process.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
