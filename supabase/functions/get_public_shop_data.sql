CREATE OR REPLACE FUNCTION public.get_public_shop_data(p_shop_id bigint)
 RETURNS TABLE(shop_data json, team_members_data json, services_data json)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT row_to_json(s.*) FROM shops s WHERE s.id = p_shop_id) as shop_data,
    (SELECT COALESCE(json_agg(tm.*), '[]'::json) FROM team_members tm WHERE tm.shop_id = p_shop_id) as team_members_data,
    (SELECT COALESCE(json_agg(sv.*), '[]'::json) FROM services sv WHERE sv.shop_id = p_shop_id) as services_data;
END;
$function$