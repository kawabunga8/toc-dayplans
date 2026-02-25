// Public API route to fetch a single day plan by ID
// Returns the plan with blocks and enrollment data if class is linked

import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: { persistSession: false },
      }
    );

    // Fetch the day plan with its blocks
    const { data: plan, error } = await supabase
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
      .eq('id', id)
      .eq('visibility', 'link')
      .single();

    if (error || !plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }

    // For each block with a class_id, fetch the enrollment
    const blocksWithEnrollments = await Promise.all(
      plan.day_plan_blocks.map(async (block: any) => {
        if (!block.class_id) {
          return { ...block, enrollments: [] };
        }

        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            student_id,
            student:students(
              id,
              first_name,
              last_name,
              photo_url
            )
          `)
          .eq('class_id', block.class_id);

        return {
          ...block,
          enrollments: enrollments || [],
        };
      })
    );

    return Response.json({
      ...plan,
      day_plan_blocks: blocksWithEnrollments,
    });
  } catch (e) {
    return Response.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
