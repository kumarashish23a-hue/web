import { Link } from 'react-router-dom';
import { AdminCrud, type CrudFormProps } from './AdminCrud';
import { CheckField, SelectField, TextAreaField, TextField } from './fields';
import { VerificationBadge } from '../../components/badges';
import { formatDate } from '../../lib/hooks';
import type { MonitoringStatus, Website } from '../../types';

interface WebsiteForm {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  officialUrl: string;
  logoUrl: string;
  isOpenSource: boolean;
  beginnerFriendly: boolean;
  monitoringStatus: string;
}

const MONITORING: MonitoringStatus[] = [
  'current',
  'due_for_check',
  'outdated',
  'changed',
  'under_review',
];

function WebsiteFields({ value, onChange }: CrudFormProps<WebsiteForm>) {
  return (
    <>
      <TextField label="Name" value={value.name} onChange={(v) => onChange({ name: v })} required />
      <TextField label="Slug" value={value.slug} onChange={(v) => onChange({ slug: v })} required placeholder="example-ai" />
      <TextField label="Tagline" value={value.tagline} onChange={(v) => onChange({ tagline: v })} />
      <TextAreaField label="Description" value={value.description} onChange={(v) => onChange({ description: v })} />
      <TextField label="Official URL" value={value.officialUrl} onChange={(v) => onChange({ officialUrl: v })} type="url" placeholder="https://…" />
      <TextField label="Logo URL" value={value.logoUrl} onChange={(v) => onChange({ logoUrl: v })} type="url" />
      <SelectField
        label="Monitoring status"
        value={value.monitoringStatus}
        onChange={(v) => onChange({ monitoringStatus: v })}
        options={MONITORING.map((m) => ({ value: m, label: m.replace(/_/g, ' ') }))}
      />
      <CheckField label="Open source" checked={value.isOpenSource} onChange={(v) => onChange({ isOpenSource: v })} />
      <CheckField label="Beginner friendly" checked={value.beginnerFriendly} onChange={(v) => onChange({ beginnerFriendly: v })} />
    </>
  );
}

export function AdminWebsites() {
  return (
    <AdminCrud<Website, WebsiteForm>
      resource="websites"
      title="Websites"
      singular="website"
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (w) => <Link to={`/websites/${w.slug}`}>{w.name}</Link>,
        },
        {
          key: 'verification',
          label: 'Verification',
          render: (w) => (
            <VerificationBadge
              status={w.verification?.status}
              lastChecked={w.verification?.lastChecked}
            />
          ),
        },
        { key: 'monitoringStatus', label: 'Monitoring' },
        {
          key: 'isDemo',
          label: 'Demo',
          render: (w) => (w.isDemo ? 'Yes' : 'No'),
        },
        {
          key: 'updated',
          label: 'Updated',
          render: (w) => formatDate((w as { updatedAt?: string }).updatedAt),
        },
      ]}
      emptyForm={() => ({
        name: '',
        slug: '',
        tagline: '',
        description: '',
        officialUrl: '',
        logoUrl: '',
        isOpenSource: false,
        beginnerFriendly: false,
        monitoringStatus: 'current',
      })}
      fromRow={(w) => ({
        name: w.name,
        slug: w.slug,
        tagline: w.tagline ?? '',
        description: w.description ?? '',
        officialUrl: w.officialUrl ?? '',
        logoUrl: w.logoUrl ?? '',
        isOpenSource: w.isOpenSource,
        beginnerFriendly: w.beginnerFriendly,
        monitoringStatus: w.monitoringStatus ?? 'current',
      })}
      toPayload={(f) => ({
        name: f.name,
        slug: f.slug,
        tagline: f.tagline || null,
        description: f.description || null,
        officialUrl: f.officialUrl || null,
        logoUrl: f.logoUrl || null,
        isOpenSource: f.isOpenSource,
        beginnerFriendly: f.beginnerFriendly,
        monitoringStatus: f.monitoringStatus,
      })}
      FormFields={WebsiteFields}
    />
  );
}
