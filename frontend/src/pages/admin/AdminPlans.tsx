import { useState } from 'react';
import { adminApi, ApiError } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { AdminTable } from '../../components/AdminTable';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { FreeBadge } from '../../components/badges';
import { formatPrice } from '../../lib/hooks';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../lib/toast';
import { CheckField, SelectField, TextAreaField, TextField } from './fields';
import type { BillingCycle, Plan, PlanKind, PlanLimit, Website } from '../../types';

const KINDS: PlanKind[] = ['free', 'free_trial', 'freemium', 'paid', 'usage_based', 'subscription', 'api_only'];
const CYCLES: BillingCycle[] = ['monthly', 'yearly', 'one_time', 'usage', 'none'];

interface PlanForm {
  name: string;
  kind: PlanKind;
  billingCycle: BillingCycle;
  priceAmount: string;
  priceCurrency: string;
  pricePer: string;
  isCurrent: boolean;
}

const emptyPlan: PlanForm = {
  name: '',
  kind: 'paid',
  billingCycle: 'monthly',
  priceAmount: '',
  priceCurrency: 'USD',
  pricePer: '',
  isCurrent: true,
};

/**
 * /admin/plans — manage plans (and their limits) for one website at a time.
 */
export function AdminPlans() {
  const { toast } = useToast();
  const websites = useFetch(() => adminApi.list<Website>('websites').then((r) => r.data));
  const [websiteId, setWebsiteId] = useState('');
  const plans = useFetch(
    () => adminApi.plansByWebsite(websiteId).then((r) => r.data),
    [websiteId],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyPlan);
  const [busy, setBusy] = useState(false);

  // --- plan limits sub-form state ---
  const [limitsFor, setLimitsFor] = useState<Plan | null>(null);
  const [newLimit, setNewLimit] = useState({ limitKind: 'requests_per_day', limitValue: '', limitUnit: '', description: '' });

  const patch = (p: Partial<PlanForm>) => setForm((f) => ({ ...f, ...p }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlan);
    setModalOpen(true);
  };
  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      kind: plan.kind,
      billingCycle: plan.billingCycle,
      priceAmount: plan.priceAmount !== null ? String(plan.priceAmount) : '',
      priceCurrency: plan.priceCurrency ?? 'USD',
      pricePer: plan.pricePer ?? '',
      isCurrent: plan.isCurrent,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        websiteId,
        name: form.name,
        kind: form.kind,
        billingCycle: form.billingCycle,
        priceAmount: form.priceAmount ? Number(form.priceAmount) : null,
        priceCurrency: form.priceCurrency || null,
        pricePer: form.pricePer || null,
        isCurrent: form.isCurrent,
      };
      if (editing) {
        await adminApi.update('plans', editing.id, payload);
        toast('Plan updated.', 'success');
      } else {
        await adminApi.create('plans', payload);
        toast('Plan created.', 'success');
      }
      setModalOpen(false);
      plans.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save plan.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addLimit = async () => {
    if (!limitsFor) return;
    try {
      await adminApi.create('plan_limits', {
        planId: limitsFor.id,
        limitKind: newLimit.limitKind,
        limitValue: newLimit.limitValue ? Number(newLimit.limitValue) : null,
        limitUnit: newLimit.limitUnit || null,
        description: newLimit.description || null,
      });
      toast('Limit added.', 'success');
      setNewLimit({ limitKind: 'requests_per_day', limitValue: '', limitUnit: '', description: '' });
      plans.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not add limit.', 'error');
    }
  };

  const removeLimit = async (limit: PlanLimit) => {
    if (!window.confirm('Remove this limit?')) return;
    try {
      await adminApi.remove('plan_limits', limit.id);
      toast('Limit removed.', 'success');
      plans.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not remove limit.', 'error');
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>Plans</h2>
      </div>

      <div className="toolbar">
        <label htmlFor="plans-website" className="muted">Website:</label>
        <select
          id="plans-website"
          className="select"
          value={websiteId}
          onChange={(e) => setWebsiteId(e.target.value)}
        >
          <option value="">Select a website…</option>
          {(websites.data ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {websiteId && (
          <Button size="sm" onClick={openCreate}>
            + Add plan
          </Button>
        )}
      </div>

      {!websiteId && <EmptyState title="Select a website to manage its plans" />}
      {websiteId && plans.loading && <LoadingState />}
      {websiteId && plans.error && <ErrorState message={plans.error} onRetry={plans.reload} />}
      {websiteId && plans.data && plans.data.length === 0 && !plans.loading && (
        <EmptyState title="No plans yet for this website" />
      )}
      {websiteId && plans.data && plans.data.length > 0 && (
        <AdminTable<Plan>
          columns={[
            { key: 'name', label: 'Plan' },
            {
              key: 'kind',
              label: 'Kind',
              render: (p) =>
                ['free', 'free_trial', 'freemium'].includes(p.kind) ? (
                  <FreeBadge label={p.kind.replace('_', ' ').toUpperCase()} />
                ) : (
                  p.kind.replace('_', ' ')
                ),
            },
            {
              key: 'price',
              label: 'Price',
              render: (p) => formatPrice(p.priceAmount, p.priceCurrency, p.pricePer),
            },
            { key: 'billingCycle', label: 'Billing' },
            {
              key: 'isCurrent',
              label: 'Current',
              render: (p) => (p.isCurrent ? 'Yes' : 'No'),
            },
            {
              key: 'limits',
              label: 'Limits',
              render: (p) => String(p.limits?.length ?? 0),
            },
          ]}
          rows={plans.data}
          rowActions={(p) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => setLimitsFor(p)}>Limits</Button>
            </>
          )}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit plan' : 'Add plan'}
        actions={[
          { label: 'Cancel', onClick: () => setModalOpen(false), variant: 'secondary' },
          { label: busy ? 'Saving…' : 'Save', onClick: save, variant: 'primary' },
        ]}
      >
        <Card>
          <TextField label="Name" value={form.name} onChange={(v) => patch({ name: v })} required />
          <SelectField label="Kind" value={form.kind} onChange={(v) => patch({ kind: v as PlanKind })} options={KINDS.map((k) => ({ value: k, label: k.replace(/_/g, ' ') }))} />
          <SelectField label="Billing cycle" value={form.billingCycle} onChange={(v) => patch({ billingCycle: v as BillingCycle })} options={CYCLES.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))} />
          <TextField label="Price amount" value={form.priceAmount} onChange={(v) => patch({ priceAmount: v })} type="number" />
          <TextField label="Currency" value={form.priceCurrency} onChange={(v) => patch({ priceCurrency: v.toUpperCase().slice(0, 3) })} placeholder="USD" />
          <TextField label="Price per" value={form.pricePer} onChange={(v) => patch({ pricePer: v })} placeholder="per month" />
          <CheckField label="Current plan" checked={form.isCurrent} onChange={(v) => patch({ isCurrent: v })} />
        </Card>
      </Modal>

      <Modal
        open={limitsFor !== null}
        onClose={() => setLimitsFor(null)}
        title={`Limits — ${limitsFor?.name ?? ''}`}
        actions={[{ label: 'Done', onClick: () => setLimitsFor(null), variant: 'primary' }]}
      >
        <Card>
          {(limitsFor?.limits ?? []).length === 0 && (
            <p className="muted">No limits recorded for this plan.</p>
          )}
          <ul className="pricing-limits">
            {(limitsFor?.limits ?? []).map((l) => (
              <li key={l.id}>
                {l.limitKind.replace(/_/g, ' ')}
                {l.limitValue !== null && l.limitValue !== undefined
                  ? `: ${l.limitValue}${l.limitUnit ? ` ${l.limitUnit}` : ''}`
                  : ''}
                {l.description ? ` — ${l.description}` : ''}{' '}
                <Button variant="danger" size="sm" onClick={() => removeLimit(l)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <h3 style={{ marginTop: '1rem' }}>Add limit</h3>
          <SelectField
            label="Limit kind"
            value={newLimit.limitKind}
            onChange={(v) => setNewLimit({ ...newLimit, limitKind: v })}
            options={['requests_per_day', 'requests_per_month', 'tokens_per_day', 'images_per_day', 'videos_per_day', 'credits', 'storage_mb', 'other'].map((k) => ({ value: k, label: k.replace(/_/g, ' ') }))}
          />
          <TextField label="Value" value={newLimit.limitValue} onChange={(v) => setNewLimit({ ...newLimit, limitValue: v })} type="number" />
          <TextField label="Unit" value={newLimit.limitUnit} onChange={(v) => setNewLimit({ ...newLimit, limitUnit: v })} placeholder="e.g. requests" />
          <TextAreaField label="Description" value={newLimit.description} onChange={(v) => setNewLimit({ ...newLimit, description: v })} rows={2} />
          <Button size="sm" onClick={addLimit}>Add limit</Button>
        </Card>
      </Modal>
    </>
  );
}
