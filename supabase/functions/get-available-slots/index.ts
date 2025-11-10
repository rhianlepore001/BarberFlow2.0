import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const TIME_STEP = 30; // Intervalo de 30 minutos

// Mapeamento de dias da semana (0=Dom, 6=Sáb) para labels do BD
const dayLabels = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

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

    const { barberId, requiredDuration, date } = await req.json()

    if (!barberId || !requiredDuration || !date) {
      return new Response(JSON.stringify({ error: 'Parâmetros incompletos.' }), {
        status: 400,
        headers: corsHeaders,
      })
    }
    
    const selectedDate = new Date(date);
    const selectedDayIndex = selectedDate.getDay();
    const selectedDayLabel = dayLabels[selectedDayIndex];
    
    // 1. Obter Shop ID e Settings
    const { data: memberData } = await supabase.from('team_members').select('shop_id').eq('id', barberId).single();
    const shopId = memberData?.shop_id;
    
    if (!shopId) {
        return new Response(JSON.stringify({ error: 'Barbeiro não encontrado.' }), { status: 404, headers: corsHeaders });
    }

    const { data: settingsData } = await supabase
        .from('shop_settings')
        .select('start_time, end_time, open_days')
        .eq('shop_id', shopId)
        .limit(1)
        .single();
        
    const startHour = settingsData?.start_time ? parseInt(settingsData.start_time.split(':')[0]) : 9;
    const endHour = settingsData?.end_time ? parseInt(settingsData.end_time.split(':')[0]) : 18;
    const openDays = settingsData?.open_days || dayLabels.slice(1, 6); // Default Seg-Sex

    if (!openDays.includes(selectedDayLabel)) {
        return new Response(JSON.stringify({ slots: [] }), { status: 200, headers: corsHeaders });
    }

    // 2. Buscar Agendamentos do Dia
    const dayStartISO = selectedDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const dayEndISO = selectedDate.toISOString().split('T')[0] + 'T23:59:59.999Z';

    const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('start_time, duration_minutes')
        .eq('barber_id', barberId)
        .gte('start_time', dayStartISO)
        .lte('start_time', dayEndISO);
        
    const occupiedIntervals = (appointmentsData || []).map(appt => {
        const apptStart = new Date(appt.start_time).getTime();
        const apptEnd = apptStart + appt.duration_minutes * 60000;
        return { start: apptStart, end: apptEnd };
    });

    // 3. Calcular Slots Disponíveis
    const availableSlots: string[] = [];
    const today = new Date();
    const isCurrentDay = selectedDate.toDateString() === today.toDateString();

    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += TIME_STEP) {
            const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            
            const slotStart = new Date(selectedDate);
            slotStart.setHours(h, m, 0, 0);
            const slotStartMs = slotStart.getTime();
            
            const slotEndMs = slotStartMs + requiredDuration * 60000;
            
            // Verifica se o slot já passou
            const isPast = isCurrentDay && slotStartMs < today.getTime();
            if (isPast) continue;
            
            // Verifica se o slot de término ultrapassa o horário de fechamento
            const endHourLimit = new Date(selectedDate);
            endHourLimit.setHours(endHour, 0, 0, 0);
            if (slotEndMs > endHourLimit.getTime()) continue;

            let isConflict = false;
            
            // Verifica conflito com agendamentos existentes
            for (const interval of occupiedIntervals) {
                // Conflito se: (Novo.start < Existente.end) AND (Novo.end > Existente.start)
                if (
                    (slotStartMs < interval.end) &&
                    (slotEndMs > interval.start)
                ) {
                    isConflict = true;
                    break;
                }
            }

            if (!isConflict) {
                availableSlots.push(slotTime);
            }
        }
    }

    return new Response(JSON.stringify({ slots: availableSlots }), {
      status: 200,
      headers: corsHeaders,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor ao calcular slots.' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})