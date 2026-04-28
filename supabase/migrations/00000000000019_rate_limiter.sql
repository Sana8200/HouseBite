create schema if not exists private;

create table private.rate_limiter (
  key varchar(100) not null,
  created_at timestamptz not null default now()
);

create or replace function private.rate_limit_sliding_window(
    p_key varchar(100),
    p_window_limit integer,
    p_window_size interval
) returns boolean 
language plpgsql
as $$
declare
    v_count integer;
begin
    delete from private.rate_limiter where key = p_key and created_at < now() - p_window_size;

    select count(*) into v_count from private.rate_limiter where key = p_key;

    if v_count < p_window_limit then
        insert into private.rate_limiter (key) values (p_key);
        return true;
    else
        return false;
    end if;
end;
$$;
