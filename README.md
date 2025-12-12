# iiimg

A minimalist image storage webapp with Supabase backend. Upload, organize, and share your images with a clean interface. [Try it here](https://iiimg.axel.mx).

## Features

- 🖱️ Drag & drop image uploads
- 📁 Automatic year/month organization
- 🖼️ Month-based gallery view
- 📋 Click to copy image URL
- 🔍 Double-click for full-size preview (Esc to close)
- 🗑️ Delete images (authenticated users only)
- 🔐 Email authentication via Supabase
- 📱 Fully responsive design
- 💾 Export/backup functionality

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon public key** from Settings → API

### 2. Create Storage Bucket

1. Go to **Storage** → Create bucket named `images` (public)
2. Go to **Storage** → **Policies**
3. Create policy for `images` bucket:
   - **Allowed operations**: INSERT, SELECT, UPDATE, DELETE
   - **Target roles**: `authenticated`
   - **Policy expressions**: `true` and `bucket_id = 'images'`

### 3. Create Database Table

Run this SQL in **SQL Editor**:

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

-- Enable Row Level Security
alter table public.image_metadata enable row level security;

-- Anyone can view images (public access)
create policy "Anyone can view images"
  on public.image_metadata for select
  using (true);

-- Only authenticated users can upload
create policy "Authenticated users can upload"
  on public.image_metadata for insert
  to authenticated
  with check (true);

-- Only authenticated users can delete
create policy "Authenticated users can delete"
  on public.image_metadata for delete
  to authenticated
  using (true);

-- Add index for faster queries
create index image_metadata_created_at_idx on public.image_metadata(created_at desc);
```

### 4. Enable Authentication

1. Go to **Authentication** → **Providers** → Ensure **Email** is enabled
2. Go to **Authentication** → **Users** → **Add user** → Create your account

### 5. Configure Locally

```bash
# Clone the repo
git clone https://github.com/axelvaldez/iiimg.git
cd iiimg

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=your_project_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Run locally
npm run dev
```

## Usage

**When not authenticated:**
- View all images
- Click to copy URLs
- Double-click for full preview

**When authenticated:**
- Upload: Drag images anywhere or click banner
- Delete: Hover and click × button
- Browse: Navigate months with Previous/Next

## Export/Backup

```bash
npm run export
```

Creates `exports/` folder with:
- `exports/images/YYYY/MM/` - All images in date folders
- `exports/metadata.json` - Database records

## Deployment

### Netlify (Recommended)

1. Push to GitHub (already configured)
2. Go to [netlify.com](https://app.netlify.com/)
3. Import from GitHub: `axelvaldez/iiimg`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Vercel / Cloudflare Pages

Same process - import from GitHub and add environment variables.

## Tech Stack

- **Frontend**: Vanilla JS + Vite
- **Backend**: Supabase (PostgreSQL + Storage)
- **Styling**: Pure CSS
- **Hosting**: Netlify

## Free Tier Limits

- 500 MB database
- 1 GB file storage
- 2 GB bandwidth/month
- 50K monthly active users

## Security

- Images are publicly viewable (good for embedding)
- Only authenticated users can upload/delete
- Row Level Security enforced at database level
- Anon key is safe to expose (RLS provides security)

## License

MIT
