'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'loading' | 'idle' | 'error';

type DomainRow = { id: string; name: string; sort_order: number | null };

type SubRow = { id: string; domain_id: string; name: string; sort_order: number | null };

type FacetRow = { id: string; subcompetency_id: string; name: string; sort_order: number | null };

export default function CoreCompetenciesClient() {
  const { isDemo } = useDemo();
  const searchParams = useSearchParams();

  const returnHref = useMemo(() => {
    const r = searchParams.get('return');
    return r && r.startsWith('/') ? r : null;
  }, [searchParams]);

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');

  const [subs, setSubs] = useState<SubRow[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('');

  const [facets, setFacets] = useState<FacetRow[]>([]);

  useEffect(() => {
    void loadDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedDomainId) return;
    void loadSubs(selectedDomainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomainId]);

  useEffect(() => {
    if (!selectedSubId) {
      setFacets([]);
      return;
    }
    void loadFacets(selectedSubId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubId]);

  async function loadDomains() {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('core_competency_domains')
        .select('id,name,sort_order')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ds = rows.map((r) => ({ id: r.id, name: r.name, sort_order: r.sort_order ?? null }));
      setDomains(ds);
      setSelectedDomainId((prev) => prev || (ds[0]?.id ?? ''));
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load domains');
    }
  }

  async function loadSubs(domainId: string) {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('core_competency_subcompetencies')
        .select('id,domain_id,name,sort_order')
        .eq('domain_id', domainId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ss = rows.map((r) => ({ id: r.id, domain_id: r.domain_id, name: r.name, sort_order: r.sort_order ?? null }));
      setSubs(ss);
      setSelectedSubId((prev) => (prev && ss.some((x) => x.id === prev) ? prev : (ss[0]?.id ?? '')));
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load sub-competencies');
    }
  }

  async function loadFacets(subId: string) {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('core_competency_facets')
        .select('id,subcompetency_id,name,sort_order')
        .eq('subcompetency_id', subId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      setFacets(rows.map((r) => ({ id: r.id, subcompetency_id: r.subcompetency_id, name: r.name, sort_order: r.sort_order ?? null })));
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load facets');
    }
  }

  const selectedDomain = domains.find((d) => d.id === selectedDomainId) ?? null;
  const selectedSub = subs.find((s) => s.id === selectedSubId) ?? null;

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Core Competencies</h1>
      <p style={styles.muted}>Domain → Sub-competency → Facet. Import is replace-only (wipe all).</p>

      <div style={{ marginTop: -8, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/admin/policies/core-competencies/import" style={styles.secondaryBtn}>
          Import CSV (replace)…
        </a>
        <a href="/admin/policies" style={styles.secondaryBtn}>
          ← Back to Policies
        </a>
        {returnHref ? (
          <a href={returnHref} style={styles.secondaryBtn}>
            ← Back
          </a>
        ) : null}
      </div>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Browse</div>
        {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={styles.fieldInline}>
            <div style={styles.label}>Core Competency</div>
            <select value={selectedDomainId} onChange={(e) => setSelectedDomainId(e.target.value)} style={styles.input} disabled={status !== 'idle'}>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ ...styles.fieldInline, minWidth: 360, flex: 1 }}>
            <div style={styles.label}>Sub-Competency</div>
            <select value={selectedSubId} onChange={(e) => setSelectedSubId(e.target.value)} style={styles.input} disabled={status !== 'idle' || !selectedDomainId}>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedDomain && selectedSub ? (
          <div style={styles.callout}>
            <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
              {selectedDomain.name} — {selectedSub.name}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{facets.length} facets</div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {facets.length ? (
            facets.map((f) => (
              <div key={f.id} style={styles.facetRow}>
                {f.name}
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.8 }}>—</div>
          )}
        </div>

        {isDemo ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>Demo mode: import disabled.</div> : null}
      </section>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  paleGold: '#FDF3DC',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  label: { color: RCS.midBlue, fontWeight: 900, fontSize: 12, marginBottom: 6 },
  fieldInline: { display: 'grid', gap: 6 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  errorBox: { marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D' },
  callout: { marginTop: 12, padding: 12, borderRadius: 12, background: RCS.paleGold, border: `1px solid ${RCS.gold}` },
  facetRow: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.lightBlue },
};
