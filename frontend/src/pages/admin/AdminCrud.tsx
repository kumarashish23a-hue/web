import { useState, type ReactNode } from 'react';
import { adminApi, ApiError } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { AdminTable, type AdminColumn } from '../../components/AdminTable';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../lib/toast';

export interface CrudFormProps<F> {
  value: F;
  onChange: (patch: Partial<F>) => void;
}

/**
 * Generic admin CRUD page: table + create/edit modal + archive action.
 * `F` is the form state; `toPayload` converts it to the API body.
 */
export function AdminCrud<T extends { id: string }, F>({
  resource,
  title,
  singular,
  columns,
  emptyForm,
  fromRow,
  toPayload,
  FormFields,
  allowDelete = false,
}: {
  resource: string;
  title: string;
  singular: string;
  columns: AdminColumn<T>[];
  emptyForm: () => F;
  fromRow: (row: T) => F;
  toPayload: (form: F) => Record<string, unknown>;
  FormFields: (props: CrudFormProps<F>) => ReactNode;
  allowDelete?: boolean;
}) {
  const { toast } = useToast();
  const list = useFetch(() => adminApi.list<T>(resource).then((r) => r.data));
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<F>(emptyForm);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setForm(emptyForm());
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (row: T) => {
    setForm(fromRow(row));
    setEditing(row);
    setCreating(false);
  };
  const close = () => {
    setCreating(false);
    setEditing(null);
  };
  const patchForm = (p: Partial<F>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await adminApi.update(resource, editing.id, toPayload(form));
        toast(`${singular} updated.`, 'success');
      } else {
        await adminApi.create(resource, toPayload(form));
        toast(`${singular} created.`, 'success');
      }
      close();
      list.reload();
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : `Could not save ${singular}.`,
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const archive = async (row: T) => {
    if (!window.confirm(`Archive this ${singular}? It will be hidden from the public site.`)) {
      return;
    }
    try {
      if (allowDelete) {
        await adminApi.remove(resource, row.id);
      } else {
        await adminApi.archive(resource, row.id);
      }
      toast(`${singular} archived.`, 'success');
      list.reload();
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : `Could not archive ${singular}.`,
        'error',
      );
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>{title}</h2>
        <Button size="sm" onClick={openCreate}>
          + Add {singular}
        </Button>
      </div>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.length === 0 && !list.loading && (
        <EmptyState title={`No ${title.toLowerCase()} yet`} />
      )}
      {list.data && list.data.length > 0 && (
        <AdminTable
          columns={columns}
          rows={list.data}
          rowActions={(row) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => archive(row)}>
                Archive
              </Button>
            </>
          )}
        />
      )}

      <Modal
        open={creating || editing !== null}
        onClose={close}
        title={editing ? `Edit ${singular}` : `Add ${singular}`}
        actions={[
          { label: 'Cancel', onClick: close, variant: 'secondary' },
          { label: busy ? 'Saving…' : 'Save', onClick: save, variant: 'primary' },
        ]}
      >
        <Card>
          <FormFields value={form} onChange={patchForm} />
        </Card>
      </Modal>
    </>
  );
}
