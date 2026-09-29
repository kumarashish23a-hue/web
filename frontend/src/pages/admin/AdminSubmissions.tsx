import { useState } from 'react';
import { adminApi, ApiError } from '../../lib/api';
import { formatDate, useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../lib/toast';
import { TextAreaField } from './fields';
import type { Submission, SubmissionStatus } from '../../types';

const STATUSES: SubmissionStatus[] = ['pending_review', 'approved', 'rejected', 'needs_info'];

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending_review: 'PENDING REVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  needs_info: 'NEEDS INFO',
};

export function AdminSubmissions() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SubmissionStatus | ''>('pending_review');
  const list = useFetch(
    () => adminApi.submissions(status || undefined).then((r) => r.data),
    [status],
  );
  const [viewing, setViewing] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const review = async (s: Submission, next: SubmissionStatus) => {
    setBusy(true);
    try {
      await adminApi.reviewSubmission(s.id, next, reviewNotes || undefined);
      toast(`Submission ${next.replace(/_/g, ' ')}.`, 'success');
      setViewing(null);
      setReviewNotes('');
      list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Review action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>Submissions</h2>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as SubmissionStatus | '')}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && !list.loading && (
        <EmptyState title="No submissions in this state" />
      )}
      {list.data && list.data.length > 0 && (
        <AdminTable<Submission>
          columns={[
            {
              key: 'name',
              label: 'Submission',
              render: (s) => String(s.payload.name ?? s.kind),
            },
            { key: 'kind', label: 'Kind' },
            {
              key: 'status',
              label: 'Status',
              render: (s) => <span className="badge badge-partial">{STATUS_LABEL[s.status]}</span>,
            },
            {
              key: 'createdAt',
              label: 'Submitted',
              render: (s) => formatDate(s.createdAt),
            },
          ]}
          rows={list.data}
          rowActions={(s) => (
            <Button variant="ghost" size="sm" onClick={() => { setViewing(s); setReviewNotes(s.reviewNotes ?? ''); }}>
              Review
            </Button>
          )}
        />
      )}

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="Review submission"
        actions={[]}
      >
        {viewing && (
          <Card>
            <dl className="fact-list">
              <dt>Kind</dt>
              <dd>{viewing.kind}</dd>
              <dt>Status</dt>
              <dd>{STATUS_LABEL[viewing.status]}</dd>
              {viewing.sourceUrl && (
                <>
                  <dt>Source URL</dt>
                  <dd>
                    <a href={viewing.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {viewing.sourceUrl}
                    </a>
                  </dd>
                </>
              )}
            </dl>
            <h3 style={{ marginTop: '1rem' }}>Payload</h3>
            <pre className="payload-preview">
              {JSON.stringify(viewing.payload, null, 2)}
            </pre>
            <div style={{ marginTop: '1rem' }}>
              <TextAreaField
                label="Review notes (shown to the submitter)"
                value={reviewNotes}
                onChange={setReviewNotes}
                rows={3}
              />
            </div>
            <div className="toolbar" style={{ marginTop: '0.5rem' }}>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => review(viewing, 'approved')}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => review(viewing, 'needs_info')}
              >
                Needs info
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => review(viewing, 'rejected')}
              >
                Reject
              </Button>
            </div>
          </Card>
        )}
      </Modal>
    </>
  );
}
