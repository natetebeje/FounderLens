
-- 1) Create content_articles table
create table if not exists public.content_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  excerpt text,
  content text not null,
  featured_image_url text,
  author_name text,
  author_avatar_url text,
  reading_time_minutes integer not null default 0,
  view_count integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  opportunity_id uuid,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique slug for routing
create unique index if not exists idx_content_articles_slug_unique
  on public.content_articles (slug);

-- Helpful indexes for queries
create index if not exists idx_content_articles_published_at
  on public.content_articles (published_at desc);
create index if not exists idx_content_articles_is_published
  on public.content_articles (is_published);

-- 2) Enable RLS
alter table public.content_articles enable row level security;

-- 3) RLS policies
-- Public can read published articles only
create policy "Public can read published stories"
  on public.content_articles
  for select
  using (is_published = true);

-- Admins can manage all stories
create policy "Admins can manage stories"
  on public.content_articles
  for all
  using (is_admin())
  with check (is_admin());

-- 4) Keep updated_at fresh
drop trigger if exists trg_content_articles_updated_at on public.content_articles;
create trigger trg_content_articles_updated_at
  before update on public.content_articles
  for each row
  execute function public.update_updated_at_column();

-- 5) Strengthen relationships for tags (if not already present)
-- NOTE: Only add these if columns exist as shown. Table already exists in schema snapshot.
-- Add FKs with cascade to keep cross-table integrity clean.
do $$
begin
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema='public' and table_name='content_article_tags' and column_name='article_id'
  ) then
    alter table public.content_article_tags
      add constraint if not exists content_article_tags_article_fk
      foreign key (article_id) references public.content_articles(id) on delete cascade;
  end if;
end $$;

