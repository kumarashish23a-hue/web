import { useState } from 'react';
import { adminApi, ApiError } from '../../lib/api';
import { formatDate, useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { VerificationBadge } from '../../components/badges';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../lib/toast';
import { TextAreaField } from './fields';
import type { VerificationRecordItem, VerificationStatus } from '../../types';

const STATUSES: (VerificationStatus | '')[] = [
  '',
  'verified',
  'partially_verified',
  'unverified',
  'outdated',
  'disputed',
];

type QueueAction = 'approve' | 'reject' | 'request_info' | 'mark_outdated';

const ACTION_LABEL: Record<QueueAction, string> = {
  approve: 'Approve (mark verified)',
  reject: 'Reject',
  request_info: 'Request review',
  mark_outdated: 'Mark outdated',
};

export function AdminVerification() {
  const { toast } = useToast();
  const [status, setStatus] = useState<VerificationStatus | ''>('');
  const queue = useFetch(
    () => adminApi.verificationQueue(status || undefined).then((r) => r.data),
    [status],
  );
  const [acting, setActing] = useState<VerificationRecordItem | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (record: VerificationRecordItem, action: QueueAction) => {
    setBusy(true);
    try {
      await adminApi.verificationAction(record.id, action, notes || undefined);
      toast(`Verification record ${action.replace(/_/g, ' ')}.`, 'success');
      setActing(null);
      setNotes('');
      queue.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>Verification queue</h2>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as VerificationStatus | '')}
          aria-label="Filter by verification status"
        >
          {STATUSES.map((s) => (
            <option key={s || 'all'} value={s}>
              {s ? s.replace(/_/g, ' ').toUpperCase() : 'All statuses'}
            </option>
          ))}
        </select>
      </div>
      <p className="muted">
        Records move through review here. Approving marks the claim verified —
        only do so against a recorded official source.
      </p>

      {queue.loading && <LoadingState />}
      {queue.error && <ErrorState message={queue.error} onRetry={queue.reload} />}
      {queue.data && queue.data.length === 0 && !queue.loading && (
        <EmptyState title="Verification queue is empty" />
      )}
      {queue.data && queue.data.length > 0 && (
        <AdminTable<VerificationRecordItem>
          columns={[
            {
              key: 'entity',
              label: 'Entity',
              render: (v) => `${v.entityType}: ${v.entityName ?? v.entityId.slice(0, 8)}`,
            },
            { key: 'claim', label: 'Claim' },
            {
              key: 'status',
              label: 'Status',
              render: (v) => <VerificationBadge status={v.status} />,
            },
            {
              key: 'verifiedAt',
              label: 'Verified at',
              render: (v) => (v.verifiedAt ? formatDate(v.verifiedAt) : '—'),
            },
          ]}
          rows={queue.data}
          rowActions={(v) => (
            <Button variant="ghost" size="sm" onClick={() => { setActing(v); setNotes(v.notes ?? ''); }}>
              Act
            </Button>
          )}
        />
      )}

      <Modal
        open={acting !== null}
        onClose={() => setActing(null)}
        title="Verification action"
        actions={[]}
      >
        {acting && (
          <Card>
            <dl className="fact-list">
              <dt>Claim</dt>
              <dd>{acting.claim}</dd>
              <dt>Current status</dt>
              <dd>
                <VerificationBadge status={acting.status} />
              </dd>
              {acting.source && (
                <>
                  <dt>Source</dt>
                  <dd>
                    <a href={acting.source.url} target="_blank" rel="noopener noreferrer">
                      {acting.source.pageTitle ?? acting.source.url}
                    </a>
                  </dd>
                </>
              )}
            </dl>
            <div style={{ marginTop: '1rem' }}>
              <TextAreaField label="Notes" value={notes} onChange={setNotes} rows={3} />
            </div>
            <div className="toolbar" style={{ marginTop: '0.5rem' }}>
              {(Object.keys(ACTION_LABEL) as QueueAction[]).map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={a === 'reject' || a === 'mark_outdated' ? 'danger' : 'secondary'}
                  disabled={busy}
                  onClick={() => act(acting, a)}
                >
                  {ACTION_LABEL[a]}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </Modal>
    </>
  );
}
