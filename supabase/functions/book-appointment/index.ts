import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { 'Authorization': req.headers.get('Authorization')! } } }
    )

    const { barberId, clientName, clientPhone, clientEmail, startTime, durationMinutes, services } = await req.json()

    if (!barberId || !clientName || !startTime || !durationMinutes || !services || services.length === 0) {
      return new Response(JSON.stringify({ error: 'Dados de agendamento incompletos.' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // 1. Obter o shop_id do barbeiro
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('shop_id')
      .eq('id', barberId)
      .single()

    if (memberError || !memberData) {
      console.error('Barber not found or shop ID missing:', memberError)
      return new Response(JSON.stringify({ error: 'Barbeiro não encontrado.' }), {
        status: 404,
        headers: corsHeaders,
      })
    }
    
    const shopId = memberData.shop_id;

    // 2. Validação de Conflito de Horário (Mais robusta: busca agendamentos do dia e verifica sobreposição)
    const newSlotStart = new Date(startTime);
    const newSlotEnd = new Date(newSlotStart.getTime() + durationMinutes * 60000);
    
    // Define o início e fim do dia para a busca
    const dayStart = new Date(newSlotStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(newSlotStart);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existingAppointments, error: conflictError } = await supabase
        .from('appointments')
        .select('start_time, duration_minutes')
        .eq('barber_id', barberId)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString());

    if (conflictError) throw conflictError;
    
    let isConflict = false;
    
    for (const appt of existingAppointments || []) {
        const apptStart = new Date(appt.start_time);
        const apptEnd = new Date(apptStart.getTime() + appt.duration_minutes * 60000);
        
        // Verifica sobreposição: (A.start < B.end) AND (A.end > B.start)
        if (newSlotStart < apptEnd && newSlotEnd > apptStart) {
            isConflict = true;
            break;
        }
    }

    if (isConflict) {
        return new Response(JSON.stringify({ error: 'Conflito de horário. Este horário já está ocupado.' }), {
            status: 409,
            headers: corsHeaders,
        })
    }

    // 3. Inserir o agendamento público
    const { data: bookingData, error: bookingError } = await supabase
      .from('public_bookings')
      .insert({
        shop_id: shopId,
        barber_id: barberId,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        start_time: startTime,
        duration_minutes: durationMinutes,
        services_json: services,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error inserting public booking:', bookingError)
      return new Response(JSON.stringify({ error: 'Falha ao registrar o agendamento.' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ message: 'Agendamento solicitado com sucesso!', booking: bookingData }), {
      status: 201,
      headers: corsHeaders,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor.' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})