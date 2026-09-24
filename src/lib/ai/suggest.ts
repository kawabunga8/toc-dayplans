import { TEACHER_ROLES, STANDING_GUARDRAILS, buildSection1FromFields } from '@/lib/teacherSuperprompt/superprompt';

// The AI writing aid runs on the local model (Ollama) on the staff laptop,
// called straight from the browser. Nothing typed into it is sent to this
// app's server or to any outside AI company — the same rule Report Card Tool
// follows. There is no cloud fallback: if Ollama can't be reached, the request
// fails with an error instead.
//
// Ollama must allow this site's origin: start it with
// OLLAMA_ORIGINS=https://toc-dayplans.vercel.app,http://localhost:3006
export const OLLAMA_URL = process.env.NEXT_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'qwen2.5:14b';

// First load of the 14B model from the external drive took ~6 minutes, and a
// full lesson flow can take several more.
const REQUEST_TIMEOUT_MS = 20 * 60 * 1000;

type Phase = { time_text: string; phase_text: string; activity_text: string; purpose_text?: string | null };

export type SuggestReq =
  | {
      section: 'note_to_toc_rewrite';
      input: {
        current_note_to_toc: string;
        class_name?: string | null;
        plan_date?: string | null;
        slot?: string | null;
        audience?: 'toc' | 'teacher';
      };
    }
  | {
      section: 'lesson_flow_phases';
      input: {
        class_name?: string | null;
        plan_date?: string | null;
        slot?: string | null;
        duration_min?: number | null;
        constraints?: string | null;
        current_phases?: Phase[];
      };
    }
  | {
      section: 'teacher_lesson_flow_phases';
      input: {
        role_id: 1 | 2 | 3 | 4 | 5 | 6;
        plan_date?: string | null;
        slot?: string | null;
        class_name?: string | null;
        section1_fields: {
          subject?: string;
          grade?: string;
          class_size?: string;
          diversity?: string;
          standards?: string;
          unit_topic?: string;
          unit_stage?: string;
          tools?: string;
          not_worked?: string;
        };
        task: string;
        constraints?: string | null;
      };
    };

export type Suggestion = { note_to_toc?: string; lesson_flow_phases?: Array<Required<Phase>> };

const PHASES_SHAPE = `{"lesson_flow_phases": [{"time_text":"","phase_text":"","activity_text":"","purpose_text":""}]}`;

export function buildSuggestPrompt(body: SuggestReq): string {
  if (body.section === 'note_to_toc_rewrite') {
    const current = String(body.input?.current_note_to_toc ?? '');
    if (!current.trim()) throw new Error('There is no Note to TOC to rewrite yet.');
    const className = String(body.input?.class_name ?? '').trim();
    const planDate = String(body.input?.plan_date ?? '').trim();
    const slot = String(body.input?.slot ?? '').trim();
    const audience = body.input?.audience ?? 'toc';
    return `Rewrite the following "Note to TOC" to be clearer and more actionable.\n\nAudience: ${audience === 'toc' ? 'TOC (support staff)' : 'Teacher'}\nClass: ${className || '—'}\nDate: ${planDate || '—'}\nBlock: ${slot || '—'}\n\nRules:\n- Keep it concise.\n- Use short sentences.\n- Preserve all concrete policies (phones/food/where to find work/etc.).\n- No emojis.\n- Output MUST be valid JSON only.\n\nReturn JSON with this exact shape:\n{"note_to_toc": "..."}\n\nINPUT NOTE:\n${current}`;
  }

  if (body.section === 'lesson_flow_phases') {
    const className = String(body.input?.class_name ?? '').trim();
    const planDate = String(body.input?.plan_date ?? '').trim();
    const slot = String(body.input?.slot ?? '').trim();
    const durationMin = body.input?.duration_min ?? null;
    const constraints = String(body.input?.constraints ?? '').trim();
    const currentPhases = Array.isArray(body.input?.current_phases) ? body.input.current_phases : [];
    return `Create a lesson flow (phases) as JSON.\n\nContext:\n- Class: ${className || '—'}\n- Date: ${planDate || '—'}\n- Block: ${slot || '—'}\n- Duration (min): ${durationMin ?? '—'}\n${constraints ? `- Constraints: ${constraints}\n` : ''}\n\nIf the user provided current phases, keep the same general structure but improve clarity and actionability.\n\nOutput MUST be valid JSON only.\nReturn this exact shape:\n${PHASES_SHAPE}\n\nCurrent phases (may be empty):\n${JSON.stringify(currentPhases, null, 2)}`;
  }

  if (body.section === 'teacher_lesson_flow_phases') {
    const role = TEACHER_ROLES.find((r) => r.id === body.input?.role_id);
    if (!role) throw new Error('Pick a role first.');
    const task = String(body.input?.task ?? '').trim();
    if (!task) throw new Error('Describe the task first.');
    const f = body.input?.section1_fields ?? {};
    const section1 = buildSection1FromFields({
      subject: f.subject,
      grade: f.grade,
      classSize: f.class_size,
      diversity: f.diversity,
      standards: f.standards,
      unitTopic: f.unit_topic,
      unitStage: f.unit_stage,
      tools: f.tools,
      notWorked: f.not_worked,
    });
    const constraints = String(body.input?.constraints ?? '').trim();
    const planDate = String(body.input?.plan_date ?? '').trim();
    const slot = String(body.input?.slot ?? '').trim();
    const className = String(body.input?.class_name ?? '').trim();
    const dayplanContext = planDate || slot || className ? `Dayplan context:\n- Date: ${planDate || '—'}\n- Block: ${slot || '—'}\n- Class: ${className || '—'}\n\n` : '';
    return `${section1}\n\n---\n\n${role.prompt}\n\n---\n\nIMPORTANT OVERRIDE FOR THIS TOOL:\n- Do NOT ask clarifying questions.\n- Do NOT output anything except valid JSON.\n- The user has provided sufficient context; make reasonable assumptions and proceed.\n- Your job is to generate a lesson flow (phases) now.\n\n---\n\n${STANDING_GUARDRAILS}\n\n---\n\n${dayplanContext}Now do this task:\n${task}\n\n${constraints ? `Constraints:\n${constraints}\n\n` : ''}Output MUST be valid JSON only.\nReturn this exact shape:\n${PHASES_SHAPE}`;
  }

  throw new Error('Unsupported section');
}

export function parseSuggestion(section: SuggestReq['section'], text: string): Suggestion {
  const parsed = extractJsonObject(text);

  if (section === 'note_to_toc_rewrite') {
    const note = String(parsed?.note_to_toc ?? '').trim();
    if (!note) throw new Error('The local model returned an empty note. Try again.');
    return { note_to_toc: note };
  }

  const phases = Array.isArray(parsed?.lesson_flow_phases) ? parsed.lesson_flow_phases : null;
  if (!phases) throw new Error('The local model did not return a lesson flow. Try again.');
  const cleaned = phases
    .map((p: any) => ({
      time_text: String(p?.time_text ?? '').trim(),
      phase_text: String(p?.phase_text ?? '').trim(),
      activity_text: String(p?.activity_text ?? '').trim(),
      purpose_text: String(p?.purpose_text ?? '').trim(),
    }))
    .filter((p: any) => p.time_text || p.phase_text || p.activity_text || p.purpose_text);
  if (cleaned.length === 0) throw new Error('The local model returned an empty lesson flow. Try again.');
  return { lesson_flow_phases: cleaned };
}

const NOT_REACHABLE =
  'Could not reach the local AI model on this laptop, so nothing was generated. ' +
  'Start Ollama (with OLLAMA_ORIGINS set to allow this site) and try again.';

const STOPPED_RESPONDING =
  'The local AI model stopped responding before it finished. The first request after starting Ollama ' +
  'has to load the model from the drive, which can take several minutes. Try again.';

export async function suggestWithLocalModel(body: SuggestReq): Promise<{ suggestion: Suggestion }> {
  const prompt = buildSuggestPrompt(body);

  // Quick reachability check first, so "Ollama isn't running / doesn't allow
  // this site" isn't confused with "the model is slow to load".
  try {
    const ping = await fetch(`${OLLAMA_URL}/api/tags`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!ping.ok) throw new Error();
  } catch {
    throw new Error(NOT_REACHABLE);
  }

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
        options: { num_ctx: 8192, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e: any) {
    if (e?.name === 'TimeoutError') throw new Error('The local AI model took too long to respond. Try again.');
    throw new Error(STOPPED_RESPONDING);
  }

  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ? `Local AI model error: ${data.error}` : NOT_REACHABLE);
  if (!data?.response) throw new Error('The local AI model returned no content. Try again.');

  return { suggestion: parseSuggestion(body.section, String(data.response)) };
}

export function extractJsonObject(text: string): any {
  const raw = String(text ?? '').trim();
  if (!raw) throw new Error('Failed to parse JSON from model output');

  // 1) Prefer exact JSON
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // 2) If wrapped in ```json ... ``` fences
  {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m?.[1]) {
      try {
        return JSON.parse(m[1].trim());
      } catch {
        // continue
      }
    }
  }

  // 3) Find the first balanced JSON object {...}
  {
    const start = raw.indexOf('{');
    if (start >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') {
          inStr = true;
          continue;
        }
        if (ch === '{') depth++;
        if (ch === '}') {
          depth--;
          if (depth === 0) return JSON.parse(raw.slice(start, i + 1));
        }
      }
    }
  }

  throw new Error('Failed to parse JSON from model output');
}
