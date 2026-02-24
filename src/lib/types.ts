export type StaffRole = 'admin' | 'editor' | 'viewer';

export type DayPlanVisibility = 'private' | 'link';

export type FridayType = 'day1' | 'day2';

export interface DayPlan {
  id: string;
  plan_date: string; // YYYY-MM-DD
  slot: string; // e.g., A, B, Flex Block, Lunch
  friday_type: FridayType | null;
  title: string;
  notes: string | null;
  visibility: DayPlanVisibility;
  share_expires_at: string | null; // ISO
  created_at: string;
}

export interface ClassBlock {
  id: string;
  day_plan_id: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  room: string;
  class_name: string;
  details: string | null;
}
