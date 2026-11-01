# Sunrise Primary School – Parent-Teacher Communication Management System

Supabase-connected web application for Sunrise Primary School, Kisumu.

## Technology
- HTML, CSS and JavaScript frontend
- Node.js built-in HTTP server for serving the frontend
- Supabase Authentication
- Supabase PostgreSQL database with Row Level Security
- Supabase Storage private bucket (`communication-files`)

## Features
- Secure email/password sign-in through Supabase Auth
- Role-based dashboards for administrators, teachers and parents
- Teacher/admin messaging and parent acknowledgements
- Parent replies using linked message records
- School events and automatic event notifications
- Message notifications and read status
- Communication history
- Administrator user management

## Run locally
1. Install Node.js 18 or later.
2. Open a terminal in this folder.
3. Run `node server.js`.
4. Open `http://localhost:3000`.

The Supabase project URL and publishable key are in `public/config.js`. The publishable key is intended for browser use; database access is restricted by RLS. Never place a Supabase secret/service-role key in frontend files.

## First administrator setup
1. In the Supabase Dashboard, open **Authentication → Users** and create the first administrator account with an email and password.
2. After the user is created, open **SQL Editor** and run the following, replacing the email with the administrator's actual email:

```sql
update public.profiles
set role = 'admin', is_active = true
where email = 'your-admin-email@example.com';
```

3. Sign in to the application with that account. Use **Users → Add User** to create teacher and parent accounts. Supabase email confirmation settings determine whether new users must verify their email before signing in.

## Supabase project
- Project ref: `shxbaxilsfvdcngsbwee`
- Region: Mumbai (`ap-south-1`)
- Tables: `profiles`, `messages`, `events`, `notifications`, `communication_history`
- Private storage bucket: `communication-files` (10 MB per file)

## Notes
- The application no longer reads or writes the old JSON database. Supabase is the backend and source of truth.
- The storage bucket and ownership policies are provisioned; the current messaging screen does not yet expose an attachment picker.
- For production, configure your own domain, SMTP/email delivery, backups, and school-specific account onboarding procedures.
