-- Mi Movistar (prototipo académico) – esquema Supabase
create extension if not exists pgcrypto;

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  phone text not null unique check (phone ~ '^9[0-9]{8}$'),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  period text not null,            -- ej. '2026-10'
  total numeric(8,2) not null,
  prev_total numeric(8,2) not null,
  due_date date,
  status text not null default 'pendiente',
  created_at timestamptz not null default now(),
  unique (participant_id, period)
);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  concept_key text not null,
  name text not null,
  amount numeric(8,2) not null,
  prev_amount numeric(8,2) not null default 0,
  explanation text,
  reason text
);

create table if not exists events (
  id bigint generated always as identity primary key,
  participant_id uuid references participants(id) on delete cascade,
  session_id uuid,
  event text not null check (char_length(event) <= 60),
  screen text check (char_length(screen) <= 60),
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_users (user_id uuid primary key references auth.users(id) on delete cascade);

alter table participants     enable row level security;
alter table bills            enable row level security;
alter table bill_items       enable row level security;
alter table events           enable row level security;
alter table survey_responses enable row level security;
alter table admin_users      enable row level security;

-- Sin políticas para anon: los anónimos no pueden leer ni escribir tablas directamente.
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admin_users where user_id = auth.uid()) $$;

create policy admin_all_participants on participants     for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_bills        on bills            for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_items        on bill_items       for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_events       on events           for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_surveys      on survey_responses for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_self             on admin_users      for select to authenticated using (user_id = auth.uid());

-- Registro: crea/actualiza participante y guarda su recibo (p_bill lo genera el cliente con buildBill)
-- p_bill = {"period":"2026-10","total":78.5,"prev_total":60,"due_date":"2026-11-15",
--           "items":[{"concept_key":"plan","name":"Plan mensual","amount":60,"prev_amount":60,"explanation":"...","reason":"..."}]}
create or replace function register_participant(p_name text, p_phone text, p_bill jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pid uuid; bid uuid; it jsonb;
begin
  insert into participants(name, phone) values (trim(p_name), p_phone)
  on conflict (phone) do update set name = excluded.name, last_seen = now()
  returning id into pid;

  select id into bid from bills where participant_id = pid and period = p_bill->>'period';
  if bid is null then
    insert into bills(participant_id, period, total, prev_total, due_date)
    values (pid, p_bill->>'period', (p_bill->>'total')::numeric, (p_bill->>'prev_total')::numeric, (p_bill->>'due_date')::date)
    returning id into bid;
    for it in select * from jsonb_array_elements(p_bill->'items') loop
      insert into bill_items(bill_id, concept_key, name, amount, prev_amount, explanation, reason)
      values (bid, it->>'concept_key', it->>'name', (it->>'amount')::numeric, coalesce((it->>'prev_amount')::numeric,0), it->>'explanation', it->>'reason');
    end loop;
  end if;
  return jsonb_build_object('participant_id', pid, 'bill_id', bid);
end $$;

create or replace function log_event(p_participant uuid, p_session uuid, p_event text, p_screen text, p_props jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into events(participant_id, session_id, event, screen, props)
  values (p_participant, p_session, left(p_event,60), left(p_screen,60), coalesce(p_props,'{}'::jsonb));
$$;

create or replace function submit_survey(p_participant uuid, p_answers jsonb)
returns void language sql security definer set search_path = public as $$
  insert into survey_responses(participant_id, answers) values (p_participant, p_answers);
$$;

revoke all on function register_participant(text,text,jsonb) from public;
revoke all on function log_event(uuid,uuid,text,text,jsonb) from public;
revoke all on function submit_survey(uuid,jsonb) from public;
grant execute on function register_participant(text,text,jsonb) to anon, authenticated;
grant execute on function log_event(uuid,uuid,text,text,jsonb) to anon, authenticated;
grant execute on function submit_survey(uuid,jsonb) to anon, authenticated;

-- Resumen para el panel del investigador (solo admins lo ven por RLS de las tablas base)
create or replace view admin_summary with (security_invoker = true) as
select p.id, p.name, p.phone, p.created_at,
  count(e.*) filter (where e.event = 'why_open')     as why_opened,
  count(e.*) filter (where e.event = 'compare_open') as compare_opened,
  bool_or(e.event = 'why_up_open')                   as reached_why_up,
  min(e.created_at) filter (where e.event = 'why_up_open') - p.created_at as time_to_why_up
from participants p left join events e on e.participant_id = p.id
group by p.id;

-- Para crear al admin: crea el usuario en Authentication > Users y luego:
-- insert into admin_users(user_id) select id from auth.users where email = 'TU_CORREO';
