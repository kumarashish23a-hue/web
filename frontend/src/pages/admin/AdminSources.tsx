import { useState } from 'react';
import { adminApi, ApiError } from '../../lib/api';
import { formatDate, useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../lib/toast';
import { SelectField, TextAreaField, TextField } from './fields';
import type { SourceRecord } from '../../types';

const SOURCE_TYPES = [
  'official_pricing',
  'official_model_page',
  'official_docs',
  'official_terms',
  'official_billing',
  'official_cancellation',
  'other',
];

/** /admin/sources — list and add verification sources. */
export function AdminSources() {
  const { toast } = useToast();
  const list = useFetch(() => adminApi.list<SourceRecord>('sources', { limit: 100 }).then((r) => r.data));
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    sourceType: 'official_pricing',
    url: '',
    pageTitle: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.url.trim()) {
      toast('URL is required.', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi.create('sources', {
        sourceType: form.sourceType,
        url: form.url.trim(),
        pageTitle: form.pageTitle.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast('Source added.', 'success');
      setModalOpen(false);
      setForm({ sourceType: 'official_pricing', url: '', pageTitle: '', notes: '' });
      list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not add source.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>Sources</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          + Add source
        </Button>
      </div>
      <p className="muted">
        Official sources back every verified claim. Prefer official pricing,
        model, docs, terms, billing, and cancellation pages.
      </p>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && !list.loading && (
        <EmptyState title="No sources recorded yet" />
      )}
      {list.data && list.data.length > 0 && (
        <AdminTable<SourceRecord>
          columns={[
            {
              key: 'url',
              label: 'URL',
              render: (s) => (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.pageTitle ?? s.url}
                </a>
              ),
            },
            {
              key: 'sourceType',
              label: 'Type',
              render: (s) => s.sourceType.replace(/_/g, ' '),
            },
            {
              key: 'retrievedAt',
              label: 'Retrieved',
              render: (s) => (s.retrievedAt ? formatDate(s.retrievedAt) : '—'),
            },
          ]}
          rows={list.data}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add source"
        actions={[
          { label: 'Cancel', onClick: () => setModalOpen(false), variant: 'secondary' },
          { label: busy ? 'Saving…' : 'Save', onClick: save, variant: 'primary' },
        ]}
      >
        <Card>
          <SelectField
            label="Source type"
            value={form.sourceType}
            onChange={(v) => setForm({ ...form, sourceType: v })}
            options={SOURCE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
          />
          <TextField label="URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} type="url" required placeholder="https://…" />
          <TextField label="Page title" value={form.pageTitle} onChange={(v) => setForm({ ...form, pageTitle: v })} />
          <TextAreaField label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} rows={2} />
        </Card>
      </Modal>
    </>
  );
}
