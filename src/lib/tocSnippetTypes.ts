export type TocSnippetPayload = {
  opening_steps?: string[];
  lesson_flow_phases?: Array<{
    time_text: string;
    phase_text: string;
    activity_text: string;
    purpose_text?: string | null;
  }>;
  what_if_items?: Array<{ scenario_text: string; response_text: string }>;
  roles?: Array<{ who: string; responsibility: string }>;
  activity_options?: Array<{
    title: string;
    description: string;
    details_text: string;
    toc_role_text?: string | null;
    steps?: Array<{ step_text: string }>;
  }>;
};

export type TocSnippetRow = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  payload: TocSnippetPayload;
};
