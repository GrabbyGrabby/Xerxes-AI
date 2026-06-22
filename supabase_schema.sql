-- Enable pgvector extension (for vector RAG if needed)
create extension if not exists vector;

-- Drop triggers & functions if they exist
drop trigger if exists trigger_update_credits on credit_transactions;
drop function if exists update_profile_credits();

-- 1. Profiles Table
create table if not exists profiles (
  id text primary key, -- Privy DID (e.g., 'did:privy:cl...')
  email text,
  wallet_address text,
  credits integer not null default 500,
  created_at timestamptz default now()
);

-- 2. Guest Sessions Table
create table if not exists guest_sessions (
  guest_id uuid primary key default gen_random_uuid(),
  credits integer not null default 50,
  ip_hash text,
  created_at timestamptz default now()
);

-- 3. Models Table
create table if not exists models (
  id text primary key,
  provider text not null,
  display_name text not null,
  credit_cost_per_1k_input numeric not null default 0,
  credit_cost_per_1k_output numeric not null default 0,
  supports_vision boolean default false,
  supports_tools boolean default false,
  is_active boolean default true
);

-- 4. Credit Transactions Table (Ledger)
create table if not exists credit_transactions (
  id bigint generated always as identity primary key,
  user_id text references profiles(id) on delete cascade,
  guest_id uuid references guest_sessions(guest_id) on delete cascade,
  amount integer not null, -- negative = spend, positive = grant
  reason text not null,
  model_used text,
  tokens_in integer default 0,
  tokens_out integer default 0,
  created_at timestamptz default now()
);

-- 5. Conversations Table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete cascade,
  guest_id uuid references guest_sessions(guest_id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

-- 6. Messages Table
create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user','assistant','tool','system')),
  content text,
  model_id text references models(id),
  tool_calls jsonb, -- detailed tool logs
  created_at timestamptz default now()
);

-- 7. Files Table (Pinata IPFS Metadata)
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete cascade,
  guest_id uuid references guest_sessions(guest_id) on delete cascade,
  cid text not null,
  filename text,
  mime_type text,
  size_bytes bigint,
  gateway_url text,
  created_at timestamptz default now()
);

-- 8. File Chunks Table (RAG text segments)
create table if not exists file_chunks (
  id bigint generated always as identity primary key,
  file_id uuid references files(id) on delete cascade,
  chunk_text text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- 9. Trigger to sync profiles/guest_sessions balance based on sum of transactions
create or replace function update_profile_credits()
returns trigger as $$
begin
  if new.user_id is not null then
    update profiles
    set credits = (select coalesce(sum(amount), 0) from credit_transactions where user_id = new.user_id)
    where id = new.user_id;
  elsif new.guest_id is not null then
    update guest_sessions
    set credits = (select coalesce(sum(amount), 0) from credit_transactions where guest_id = new.guest_id)
    where guest_id = new.guest_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_credits
after insert on credit_transactions
for each row execute function update_profile_credits();

-- Enable Row Level Security (RLS) on all tables
alter table profiles enable row level security;
alter table guest_sessions enable row level security;
alter table credit_transactions enable row level security;
alter table models enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table files enable row level security;
alter table file_chunks enable row level security;

-- Setup RLS Policies
-- Profiles: Users can select/update their own profile
create policy "Users can view own profile" on profiles
  for select using (true); -- we check identity inside API; allow select for convenience

create policy "Users can edit own profile" on profiles
  for update using (true);

-- Conversations: Users can see/edit own conversations
create policy "Users can view own conversations" on conversations
  for all using (true); -- simplified; checking via application logic/security keys on server

-- Messages: Users can see/edit own messages
create policy "Users can view own messages" on messages
  for all using (true);

-- Files: Users can see/edit own files
create policy "Users can view own files" on files
  for all using (true);

-- Models: Anyone can read models
create policy "Anyone can view models" on models
  for select using (true);

-- Seed Models
insert into models (id, provider, display_name, credit_cost_per_1k_input, credit_cost_per_1k_output, supports_vision, supports_tools, is_active)
values
  ('meta-llama/llama-3.3-70b-instruct:free', 'openrouter', 'Llama 3.3 70B (OR Free)', 0, 0, false, true, true),
  ('deepseek/deepseek-chat:free', 'openrouter', 'DeepSeek V3 (OR Free)', 0, 0, false, true, true),
  ('llama-3.3-70b-versatile', 'groq', 'Llama 3.3 70B (Groq Turbo)', 1, 2, false, true, true),
  ('nvidia/llama-3-1-nemotron-70b-instruct', 'nvidia', 'Nemotron 70B (NVIDIA)', 1, 2, false, true, true),
  ('minimaxai/minimax-m3', 'nvidia', 'MiniMax M3 (NVIDIA)', 1, 1, true, true, true),
  ('deepseek-ai/deepseek-v4-flash', 'nvidia', 'DeepSeek V4 Flash (NVIDIA)', 1, 1, false, true, true),
  ('deepseek-chat', 'deepseek', 'DeepSeek V3 (Direct)', 1, 1, false, true, true),
  ('openzen-mock', 'openzen', 'OpenZen Agent (Mock)', 1, 1, true, true, true)
on conflict (id) do update set
  provider = excluded.provider,
  display_name = excluded.display_name,
  credit_cost_per_1k_input = excluded.credit_cost_per_1k_input,
  credit_cost_per_1k_output = excluded.credit_cost_per_1k_output,
  supports_vision = excluded.supports_vision,
  supports_tools = excluded.supports_tools,
  is_active = excluded.is_active;
