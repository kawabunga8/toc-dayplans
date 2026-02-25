// Public API route to fetch visible day plans for a given week
// Returns all day plans for Mon-Fri of the week containing the given date

import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateStr = url.searchParams.get('date'); // YYYY-MM-DD, defaults to today

  const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  
  // Calculate Monday of this week (local timezone)
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  
  // Friday of the same week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  // Format as YYYY-MM-DD (local, not UTC)
  const toDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const mondayStr = toDateString(monday);
  const fridayStr = toDateString(friday);

  try {
    // Use service role key to bypass RLS (better approach is to create a special anon policy)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

    // Fetch all visible plans for this week
    const { data: plans, error } = await supabase
      .from('day_plans')
      .select(`
        id,
        plan_date,
        slot,
        title,
        notes,
        visibility,
        day_plan_blocks(
          id,
          start_time,
          end_time,
          room,
          class_name,
          details,
          class_id
        )
      `)
      .gte('plan_date', mondayStr)
      .lte('plan_date', fridayStr)
      .eq('visibility', 'link'); // Only public plans

    if (error) {
      console.error('Supabase error:', error);
      // Check if it's a schema/column error
      if (error.message?.includes('does not exist')) {
        return Response.json(
          { error: 'database-not-configured', message: 'Database schema is not set up. Please run supabase/schema.sql in your Supabase dashboard.' },
          { status: 503 }
        );
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Group by date
    const grouped = (plans || []).reduce(
      (acc, plan) => {
        const date = plan.plan_date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(plan);
        return acc;
      },
      {} as Record<string, typeof plans>
    );

    return Response.json({
      week: { start: mondayStr, end: fridayStr },
      plans: grouped,
    });
  } catch (e) {
    return Response.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
