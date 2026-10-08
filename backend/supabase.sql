-- Helder 3. Run once in your OWN Supabase SQL editor.
-- User data is never shared. No service-role key belongs in the browser.
begin;
create schema if not exists private;
create table if not exists public.helder_collections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.helder_collections enable row level security;
revoke all on public.helder_collections from anon, authenticated;
grant select on public.helder_collections to authenticated;
drop policy if exists helder_owner_read on public.helder_collections;
create policy helder_owner_read on public.helder_collections for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Privileged implementation is in a NON-exposed schema, with a pinned search
-- path and explicit owner check. The public wrapper is SECURITY INVOKER.
create or replace function private.helder_push_impl(p_payload jsonb,p_expected bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_revision bigint; inserted_revision bigint;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_expected is null or p_expected < 0 then raise exception 'Invalid revision'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or coalesce(p_payload->>'version','') <> '1' or octet_length(p_payload::text) > 8388608
    or coalesce(jsonb_typeof(p_payload->'folders'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'sets'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'notes'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'cards'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'reviews'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'activities'),'') <> 'array'
    or coalesce(jsonb_typeof(p_payload->'settings'),'') <> 'object'
    then raise exception 'Invalid or oversized collection'; end if;
  select revision into current_revision from public.helder_collections where user_id=owner_id for update;
  if not found then
    if p_expected <> 0 then return jsonb_build_object('ok',false,'revision',0); end if;
    insert into public.helder_collections(user_id,revision,payload) values(owner_id,1,p_payload)
      on conflict (user_id) do nothing returning revision into inserted_revision;
    if inserted_revision is null then
      select revision into current_revision from public.helder_collections where user_id=owner_id;
      return jsonb_build_object('ok',false,'revision',current_revision);
    end if;
    return jsonb_build_object('ok',true,'revision',1);
  end if;
  if current_revision <> p_expected then return jsonb_build_object('ok',false,'revision',current_revision); end if;
  update public.helder_collections set payload=p_payload,revision=current_revision+1,updated_at=now() where user_id=owner_id;
  return jsonb_build_object('ok',true,'revision',current_revision+1);
end;
$$;
revoke all on function private.helder_push_impl(jsonb,bigint) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.helder_push_impl(jsonb,bigint) to authenticated;
create or replace function public.helder_push(p_payload jsonb,p_expected bigint)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.helder_push_impl(p_payload,p_expected);
$$;
revoke all on function public.helder_push(jsonb,bigint) from public, anon;
grant execute on function public.helder_push(jsonb,bigint) to authenticated;
commit;
