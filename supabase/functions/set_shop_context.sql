CREATE OR REPLACE FUNCTION public.set_shop_context(p_shop_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Define a variável de configuração para a sessão atual (TRUE para persistir)
  PERFORM set_config('app.current_shop_id', p_shop_id::text, TRUE);
END;
$function$