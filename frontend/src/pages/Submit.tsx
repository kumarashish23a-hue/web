import { useState, type FormEvent } from 'react';
import { submissionsApi, ApiError } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { formatDate } from '../lib/hooks';
import { useFetch } from '../lib/hooks';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, LoadingState } from '../components/States';
import { PageSeo } from '../components/Seo';
import { useToast } from '../lib/toast';
import type { SubmissionKind } from '../types';

const KINDS: { value: SubmissionKind; label: string }[] = [
  { value: 'website', label: 'New AI website' },
  { value: 'model', label: 'New AI model' },
  { value: 'pricing', label: 'Pricing update' },
  { value: 'free_access', label: 'Free-access info' },
  { value: 'correction', label: 'Correction to existing data' },
];

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_info: 'Needs more info',
};

export function Submit() {
  const { toast } = useToast();
  const mine = useFetch(() => submissionsApi.mine().then((r) => r.data));

  const [kind, setKind] = useState<SubmissionKind>('website');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await submissionsApi.create(
        kind,
        {
          name: name.trim(),
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          details: details.trim() || undefined,
        },
        sourceUrl.trim() || undefined,
      );
      toast('Submitted — it is now pending review.', 'success');
      // Analytics: coarse only — the submission kind, never the payload.
      trackEvent('submission_created', { meta: { kind } });
      setName('');
      setUrl('');
      setDescription('');
      setDetails('');
      setSourceUrl('');
      mine.reload();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Submission failed. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageSeo
        meta={{
          title: 'Submit a listing',
          description:
            'Suggest a new AI website or model for the AI Discovery catalog. Submissions are reviewed before publishing.',
        }}
      />
      <div className="page-head">
        <h1>Submit a listing</h1>
        <p>
          Found an AI tool we are missing, or spotted wrong pricing? Send it in
          — anonymous submissions are welcome. Everything goes through human
          review before it appears on the site.
        </p>
      </div>

      <div className="grid grid-2">
        <Card>
          <form onSubmit={onSubmit}>
            {error && <p className="form-error">{error}</p>}
            <div className="field">
              <label htmlFor="sub-kind">What are you submitting?</label>
              <select
                id="sub-kind"
                className="select"
                value={kind}
                onChange={(e) => setKind(e.target.value as SubmissionKind)}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sub-name">Name</label>
              <input
                id="sub-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Example AI Studio"
              />
            </div>
            <div className="field">
              <label htmlFor="sub-url">Official URL</label>
              <input
                id="sub-url"
                type="url"
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="field">
              <label htmlFor="sub-desc">Description</label>
              <textarea
                id="sub-desc"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="field">
              <label htmlFor="sub-details">
                Details (pricing, free tier, limits — anything you know)
              </label>
              <textarea
                id="sub-details"
                className="input"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
              />
            </div>
            <div className="field">
              <label htmlFor="sub-source">Source URL (where did you learn this?)</label>
              <input
                id="sub-source"
                type="url"
                className="input"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit for review'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2>Your submissions</h2>
          {mine.loading && <LoadingState />}
          {mine.data && mine.data.length === 0 && (
            <EmptyState
              title="No submissions yet"
              hint="Log in to track your submissions across devices. Anonymous submissions are accepted but not listed here."
            />
          )}
          {mine.data && mine.data.length > 0 && (
            <ul className="pricing-limits">
              {mine.data.map((s) => (
                <li key={s.id}>
                  <strong>{String(s.payload.name ?? s.kind)}</strong>{' '}
                  <span className="chip">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <br />
                  <span className="muted">{formatDate(s.createdAt)}</span>
                  {s.reviewNotes && <p className="muted">{s.reviewNotes}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
