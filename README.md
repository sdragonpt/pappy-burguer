# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Database setup

Apply the SQL files in `drizzle/migrations/` in order (Supabase → SQL Editor, or via Lovable):

1. `0000_migration.sql` – tables, roles, row-level security (already applied by Lovable)
2. `0001_orders_server_side.sql` – orders go through `place_order()`, which prices them on the server, checks opening hours and rate-limits; customer tracking via `order_status()`
3. `0002_daily_maintenance.sql` – `daily_maintenance()`: deletes orders older than 12 months
4. `0003_storage_and_grants.sql` – creates the `media` bucket; stops visitors calling internal functions

After creating the owner's account at `/admin`, turn off new sign-ups in Supabase → Authentication → Sign In / Providers.

## Keeping a Supabase Free project awake

Supabase pauses Free projects after 7 days without activity. The workflow
`.github/workflows/daily-maintenance.yml` calls `daily_maintenance()` once a day, which counts as activity
(a pg_cron job inside the database does not).

1. Keep this project in a **private** GitHub repository (GitHub disables scheduled workflows in public repos after 60 days without commits).
2. Nothing else to configure: the workflow reads the public Supabase URL and publishable key from `.env`.
   Repository secrets or variables named `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` override them (never use the service-role key).
3. Actions → Daily maintenance → **Run workflow** once to check it returns `{"ok":true,...}`.

If a run fails, GitHub emails the repository owner.
