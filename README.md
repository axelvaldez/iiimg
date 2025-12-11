# 📸 Image Storage App

A simple, elegant image storage webapp built with Supabase and Vite. Upload, store, and manage your images with drag-and-drop functionality.

## Features

- 🖱️ Drag & drop image uploads
- 🖼️ Paginated thumbnail gallery
- 📋 Click to copy image URL
- 🔍 Double-click for full-size preview
- 📱 Fully responsive design
- 🆓 100% free tier (Supabase)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project name**: `image-storage` (or anything you like)
   - **Database password**: (save this somewhere safe)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait ~2 minutes

### 2. Create Storage Bucket

1. In your Supabase dashboard, go to **Storage** (left sidebar)
2. Click "Create a new bucket"
3. Name it: `images`
4. Set it to **Public** (toggle the switch)
5. Click "Create bucket"

### 2.5. Add Storage Policies

After creating the bucket, you need to add policies so anyone can upload:

1. Go to **Storage** → click on **Policies** (in the Storage section)
2. Find the `images` bucket and click "New Policy"
3. Select "For full customization"
4. Create this policy:
   - **Policy name**: `Allow public uploads`
   - **Allowed operation**: Check `INSERT`, `SELECT`, `UPDATE`, `DELETE`
   - **Target roles**: Select `public`
   - **Policy definition - USING expression**: `true`
   - **WITH CHECK expression**: `bucket_id = 'images'`
5. Click "Review" then "Save policy"

**Alternative**: Click "Use a template" → "Allow public access (read-only)" or create custom policies for each operation if you want more control.

### 3. Create Database Table

1. Go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Paste this SQL and click "Run":

```sql
-- Create the images metadata table
create table public.image_metadata (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  original_name text not null,
  storage_path text not null,
  public_url text not null,
  size bigint,
  mime_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.image_metadata enable row level security;

-- Create policy to allow anyone to read images
create policy "Public images are viewable by everyone"
  on public.image_metadata for select
  to anon, authenticated
  using (true);

-- Create policy to allow anyone to upload images
create policy "Anyone can upload images"
  on public.image_metadata for insert
  to anon, authenticated
  with check (true);

-- Create policy to allow anyone to delete images
create policy "Anyone can delete images"
  on public.image_metadata for delete
  to anon, authenticated
  using (true);

-- Optional: Add an index for faster queries
create index image_metadata_created_at_idx on public.image_metadata(created_at desc);
```

**IMPORTANT:** After running this, verify the policies were created:
- Go to **Database** → **Tables** → `image_metadata` → **Policies**
- You should see 2 policies listed
- If not, the SQL failed - check for error messages

### 4. Get Your Credentials

1. Go to **Project Settings** (gear icon, bottom left)
2. Click **API** in the left menu
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 5. Enable Email Authentication

1. Go to **Authentication** in the left sidebar
2. Click **Providers**
3. Find **Email** and make sure it's enabled (it should be by default)
4. Scroll down and click **Save** if you made changes

### 6. Create Your Admin User

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter your email and password
4. Click **Create user**
5. Check your email and confirm if required

### 7. Update Database Policies for Auth

1. Go to **SQL Editor**
2. Run this SQL to update policies (restricts upload/delete to authenticated users):

```sql
-- Drop old public policies
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON public.image_metadata;
DROP POLICY IF EXISTS "Anyone can upload images" ON public.image_metadata;
DROP POLICY IF EXISTS "Anyone can delete images" ON public.image_metadata;

-- Anyone can view images (public access)
CREATE POLICY "Anyone can view images"
  ON public.image_metadata FOR SELECT
  USING (true);

-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload"
  ON public.image_metadata FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete"
  ON public.image_metadata FOR DELETE
  TO authenticated
  USING (true);
```

### 8. Update Storage Policies

1. Go to **Storage** → **Policies**
2. Delete any existing policies for the `images` bucket
3. Create a new policy:
   - **Policy name**: `Authenticated access`
   - **Allowed operations**: Check INSERT, SELECT, UPDATE, DELETE
   - **Target roles**: `authenticated` (NOT public)
   - **USING expression**: `true`
   - **WITH CHECK expression**: `bucket_id = 'images'`

### 9. Configure the App

1. Clone/download this project
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and paste your credentials:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### 10. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to the URL shown (usually `http://localhost:5173`)

## Usage

**Login first**: Use the email and password you created in Supabase

When **not authenticated**:
- View all images publicly
- Click to copy URLs
- Double-click for full preview
- No upload or delete functionality

When **authenticated** (logged in):
1. **Upload**: Drag images anywhere on the page, or click the banner to browse
2. **Delete**: Hover over images and click the × button
3. **Navigate**: Browse through months with Previous/Next buttons
4. **Logout**: Click the Logout button in the header

## Export / Backup

To export all your images and metadata (for backup or migration):

```bash
npm run export
```

This will create an `exports/` folder containing:
- `exports/images/` - All your downloaded images
- `exports/metadata.json` - Complete database records

Use this before migrating to another service or as a regular backup.

## Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Option 2: Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and import your repository
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in site settings

### Option 3: Cloudflare Pages

1. Push your code to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connect your repository
4. Build command: `npm run build`
5. Build output: `dist`
6. Add environment variables

## Free Tier Limits

**Supabase Free Tier:**
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth per month
- 50,000 monthly active users

Perfect for personal use! Upgrade later if needed.

## Security Note

This app now uses **authentication**:
- Images are **publicly viewable** (anyone can see and embed them)
- Only **authenticated users** can upload or delete images
- Create your user account through Supabase dashboard
- Use strong passwords for your admin account

Perfect for a personal image CDN that's public but controlled!

## Troubleshooting

### 401 Error / Images not loading?

This means Row Level Security policies aren't working. **Quick fix:**

1. Go to Supabase **SQL Editor**
2. Run this command to check policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'image_metadata';
   ```
3. If you see 0 rows, the policies weren't created. Run this:
   ```sql
   -- Drop and recreate policies
   drop policy if exists "Public images are viewable by everyone" on public.image_metadata;
   drop policy if exists "Anyone can upload images" on public.image_metadata;
   
   create policy "Public images are viewable by everyone"
     on public.image_metadata for select
     to anon, authenticated
     using (true);
   
   create policy "Anyone can upload images"
     on public.image_metadata for insert
     to anon, authenticated
     with check (true);
   ```

### 400 Error / "new row violates row-level security policy"?

This means the storage bucket needs policies. **Fix via UI:**

1. Go to **Storage** → **Policies** in Supabase dashboard
2. Find the `images` bucket
3. Click "New Policy" → "For full customization"
4. Fill in:
   - **Policy name**: `Allow public access`
   - **Allowed operation**: Check all (INSERT, SELECT, UPDATE, DELETE)
   - **Target roles**: `public`
   - **USING expression**: `true`
   - **WITH CHECK expression**: `bucket_id = 'images'`
5. Save the policy

Then refresh your app and try uploading again.

**Alternative:** Disable RLS temporarily for testing (NOT for production):
```sql
alter table public.image_metadata disable row level security;
alter table storage.objects disable row level security;
```

**Images not uploading?**
- Check your `.env` file has correct credentials
- Verify the storage bucket is named `images` and is public
- Check browser console for errors

**Images not displaying?**
- Verify the database table was created successfully
- Check that RLS policies are enabled
- Test the SQL query in Supabase SQL Editor

**Build errors?**
- Delete `node_modules` and run `npm install` again
- Make sure you're using Node.js v18 or higher

## Tech Stack

- **Frontend**: Vanilla JavaScript + Vite
- **Backend/Storage**: Supabase (PostgreSQL + S3-compatible storage)
- **Styling**: Pure CSS with gradient design
- **Hosting**: Vercel/Netlify/Cloudflare Pages

## License

MIT - feel free to use for any project!
