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
    // Usamos a chave anon para acesso público
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { 'Authorization': req.headers.get('Authorization')! } } }
    )

    const { barberId, clientName, clientPhone, clientEmail, startTime, durationMinutes, services } = await req.json()

    if (!barberId || !clientName || !clientPhone || !startTime || !durationMinutes || !services || services.length === 0) {
      return new Response(JSON.stringify({ error: 'Dados de agendamento incompletos (Nome, Telefone, Horário e Serviço são obrigatórios).' }), {
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

    if (memberError || !memberData || !memberData.shop_id) {
      console.error('Barber not found or shop ID missing:', memberError)
      return new Response(JSON.stringify({ error: 'Barbeiro ou loja não encontrados.' }), {
        status: 404,
        headers: corsHeaders,
      })
    }
    
    const shopId = memberData.shop_id;

    // 2. Buscar/Criar Cliente (Busca por telefone é a chave para evitar duplicidade)
    let clientId = null;
    
    // Tenta encontrar cliente pelo telefone
    const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('shop_id', shopId)
        .eq('phone', clientPhone) 
        .limit(1)
        .single();
        
    if (existingClient) {
        clientId = existingClient.id;
    } else {
        // Se não existir, cria um novo cliente
        const defaultImageUrl = `https://ui-avatars.com/api/?name=${clientName.replace(' ', '+')}&background=4169E1&color=101012`;
        
        const { data: newClientData, error: clientError } = await supabase
            .from('clients')
            .insert({
                shop_id: shopId,
                name: clientName,
                phone: clientPhone,
                image_url: defaultImageUrl,
            })
            .select('id')
            .single();
            
        if (clientError) {
            console.error('Error creating client:', clientError);
            return new Response(JSON.stringify({ error: `Falha ao criar o registro do cliente: ${clientError.message}` }), {
                status: 500,
                headers: corsHeaders,
            })
        } else if (newClientData) {
            clientId = newClientData.id;
        }
    }
    
    if (!clientId) {
        return new Response(JSON.stringify({ error: 'Falha crítica: Não foi possível obter ou criar o ID do cliente.' }), {
            status: 500,
            headers: corsHeaders,
        })
    }

    // 3. Validação de Conflito de Horário (Segurança final)
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
        return new Response(JSON.stringify({ error: 'Conflito de horário detectado. Por favor, selecione outro horário.' }), {
            status: 409,
            headers: corsHeaders,
        })
    }

    // 4. Inserir o agendamento na tabela principal (appointments)
    const { data: appointmentData, error: bookingError } = await supabase
      .from('appointments')
      .insert({
        shop_id: shopId,
        barber_id: barberId,
        client_id: clientId, 
        start_time: startTime,
        duration_minutes: durationMinutes,
        services_json: services,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error inserting appointment:', bookingError)
      return new Response(JSON.stringify({ error: `Falha ao registrar o agendamento: ${bookingError.message}` }), {
        status: 500,
        headers: corsHeaders,
      })
    }
    
    // 5. Atualizar a última visita do cliente
    if (clientId) {
        await supabase.from('clients').update({ last_visit: new Date().toISOString() }).eq('id', clientId);
    }

    return new Response(JSON.stringify({ message: 'Agendamento realizado com sucesso!', appointment: appointmentData }), {
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