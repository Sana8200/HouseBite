create or replace function public.increment_receipt_total(p_receipt_id uuid, p_inc numeric)
 returns void
 language plpgsql
as $$
begin
  update public.receipt set total = total + p_inc where id = p_receipt_id;
end;
$$;
