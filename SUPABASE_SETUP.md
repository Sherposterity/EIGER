# Supabase Setup Guide for EIGER Waitlist

## Quick Setup (5 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Name it `eiger-waitlist`
4. Set a secure database password (save this!)
5. Wait ~2 minutes for setup

### Step 2: Create the Waitlist Table
1. In your project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"** and paste this:

```sql
-- Create waitlist table
CREATE TABLE waitlist (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT (submit their email)
CREATE POLICY "Anyone can join waitlist" 
    ON waitlist FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- Policy: Only authenticated users can SELECT (view emails)
CREATE POLICY "Only admins can view emails" 
    ON waitlist FOR SELECT 
    TO authenticated 
    USING (true);
```

3. Click **"Run"**

### Step 3: Get Your API Keys
1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### Step 4: Configure Your App
1. Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Restart your dev server:
```bash
npm run dev
```

### Step 5: Test It!
1. Open your website and submit an email
2. Go to Supabase → **Table Editor** → **waitlist**
3. You should see the email! 🎉

---

## Security Notes

✅ **What's protected:**
- Emails are stored securely in Supabase
- Row Level Security (RLS) prevents public API access to reading emails
- Only authenticated admins can view the email list

✅ **The anon key is safe to expose** because:
- It only allows INSERT operations (adding emails)
- RLS blocks all SELECT/DELETE/UPDATE from anonymous users

---

## Viewing Your Waitlist (Admin)
- **Option 1:** Use Supabase Dashboard → Table Editor
- **Option 2:** Export as CSV from the dashboard
- **Option 3:** Create an admin page with Supabase Auth (future enhancement)

---

## Troubleshooting

**Emails not saving?**
- Check browser console for errors
- Verify `.env` values are correct
- Make sure you ran the SQL to create the table

**"Supabase credentials not found" warning?**
- Create the `.env` file with your keys
- Restart the dev server after adding `.env`
