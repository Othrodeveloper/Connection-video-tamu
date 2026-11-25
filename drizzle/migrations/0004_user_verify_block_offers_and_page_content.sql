alter table public.profiles
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_blocked boolean not null default false;

alter table public.site_settings
  add column if not exists content jsonb not null default '{}'::jsonb;

create or replace function public.protect_profile_flags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.is_verified is distinct from old.is_verified or new.is_blocked is distinct from old.is_blocked)
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_flags on public.profiles;
create trigger protect_profile_flags before update on public.profiles
  for each row execute function public.protect_profile_flags();

create policy "Admins update profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
      or (
        not exists (select 1 from public.profiles where id = _user_id and is_blocked)
        and exists (select 1 from public.subscriptions where user_id = _user_id and expires_at > now())
      )
$$;

create policy "Admins delete payments" on public.payments for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete memberships" on public.group_memberships for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete subscriptions" on public.subscriptions for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.admin_grant_days_all(_days integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  _uid uuid;
  _n int := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  if _days <= 0 then raise exception 'Siku lazima ziwe zaidi ya 0'; end if;
  for _uid in select id from public.profiles where not is_blocked loop
    perform public._grant_days(_uid, _days, null, 'offer');
    _n := _n + 1;
  end loop;
  return _n;
end;
$$;

create or replace function public.admin_end_access(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.subscriptions set expires_at = now() where user_id = _user_id and expires_at > now();
end;
$$;

revoke execute on function public.admin_grant_days_all(integer) from anon;
revoke execute on function public.admin_end_access(uuid) from anon;