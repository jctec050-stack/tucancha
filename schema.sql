-- Create profiles table to store user metadata (linked to auth.users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text check (role in ('OWNER', 'PLAYER')),
  created_at timestamptz default now()
);

-- Venues (Complejos) table
create table public.venues (
  id uuid not null default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id),
  name text not null,
  address text,
  image_url text,
  opening_hours text,
  amenities text[], -- Array of strings
  contact_info text,
  created_at timestamptz default now()
);

-- Courts (Canchas) table
create table public.courts (
  id uuid not null default gen_random_uuid() primary key,
  venue_id uuid references public.venues(id) on delete cascade,
  name text not null,
  type text check (type in ('Padel', 'Beach Tennis')),
  price_per_hour numeric not null,
  created_at timestamptz default now()
);

-- Bookings (Reservas) table
create table public.bookings (
  id uuid not null default gen_random_uuid() primary key,
  venue_id uuid references public.venues(id),
  court_id uuid references public.courts(id),
  player_id uuid references public.profiles(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  price numeric not null,
  status text check (status in ('ACTIVE', 'CANCELLED', 'COMPLETED')) default 'ACTIVE',
  created_at timestamptz default now()
);

-- RLS (Row Level Security) Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.courts enable row level security;
alter table public.bookings enable row level security;

-- Policies for Profiles
-- Users can read their own profile
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Allow profile creation during signup (used by trigger)
create policy "Enable insert for authenticated users during signup" on public.profiles
  for insert with check (true);

-- Policies for Venues
-- Everyone can read venues (for search)
create policy "Venues are viewable by everyone" on public.venues
  for select using (true);

-- Owners can insert/update their own venues
create policy "Owners can insert own venues" on public.venues
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own venues" on public.venues
  for update using (auth.uid() = owner_id);

-- Policies for Courts
-- Everyone can read courts
create policy "Courts are viewable by everyone" on public.courts
  for select using (true);

-- Owners can manage courts
create policy "Owners can manage courts" on public.courts
  for all using (
    exists (
      select 1 from public.venues
      where venues.id = courts.venue_id
      and venues.owner_id = auth.uid()
    )
  );

-- Policies for Bookings
-- Players can read their own bookings
create policy "Players can read own bookings" on public.bookings
  for select using (auth.uid() = player_id);

-- Owners can read bookings for their venues
create policy "Owners can read bookings for their venues" on public.bookings
  for select using (
    exists (
      select 1 from public.venues
      where venues.id = bookings.venue_id
      and venues.owner_id = auth.uid()
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', ''), 
    coalesce(new.raw_user_meta_data->>'role', 'PLAYER')
  );
  return new;
exception
  when others then
    raise log 'Error creating profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Disabled Slots Table
create table public.disabled_slots (
  id uuid not null default gen_random_uuid() primary key,
  venue_id uuid references public.venues(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  date date not null,
  time_slot varchar(5) not null,
  reason text,
  created_at timestamptz default now(),
  unique(court_id, date, time_slot)
);

alter table public.disabled_slots enable row level security;

-- Policies for Disabled Slots
create policy "Owners can manage disabled slots for their venues" on public.disabled_slots
  for all using (
    exists (
      select 1 from public.venues
      where venues.id = disabled_slots.venue_id
      and venues.owner_id = auth.uid()
    )
  );

create policy "Everyone can read disabled slots" on public.disabled_slots
  for select using (true);
