import { Link } from 'react-router-dom';
import { AdminCrud, type CrudFormProps } from './AdminCrud';
import { CheckField, SelectField, TextAreaField, TextField } from './fields';
import { VerificationBadge } from '../../components/badges';
import type { AiModel, AiType } from '../../types';

interface ModelForm {
  name: string;
  slug: string;
  description: string;
  modelType: AiType;
  isOpenSource: boolean;
  license: string;
  contextWindowTokens: string;
  apiAvailable: boolean;
}

const TYPES: AiType[] = [
  'chat', 'image', 'video', 'audio', 'music', 'voice', 'stt',
  'embedding', 'code', 'agent', 'multimodal', 'other',
];

function ModelFields({ value, onChange }: CrudFormProps<ModelForm>) {
  return (
    <>
      <TextField label="Name" value={value.name} onChange={(v) => onChange({ name: v })} required />
      <TextField label="Slug" value={value.slug} onChange={(v) => onChange({ slug: v })} required />
      <TextAreaField label="Description" value={value.description} onChange={(v) => onChange({ description: v })} />
      <SelectField
        label="Model type"
        value={value.modelType}
        onChange={(v) => onChange({ modelType: v as AiType })}
        options={TYPES.map((t) => ({ value: t, label: t }))}
      />
      <TextField label="License" value={value.license} onChange={(v) => onChange({ license: v })} placeholder="e.g. Apache-2.0" />
      <TextField
        label="Context window (tokens)"
        value={value.contextWindowTokens}
        onChange={(v) => onChange({ contextWindowTokens: v })}
        type="number"
      />
      <CheckField label="Open source" checked={value.isOpenSource} onChange={(v) => onChange({ isOpenSource: v })} />
      <CheckField label="API available" checked={value.apiAvailable} onChange={(v) => onChange({ apiAvailable: v })} />
    </>
  );
}

export function AdminModels() {
  return (
    <AdminCrud<AiModel, ModelForm>
      resource="models"
      title="Models"
      singular="model"
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (m) => <Link to={`/models/${m.slug}`}>{m.name}</Link>,
        },
        { key: 'modelType', label: 'Type' },
        {
          key: 'provider',
          label: 'Provider',
          render: (m) => m.provider?.name ?? '—',
        },
        {
          key: 'verification',
          label: 'Verification',
          render: (m) => (
            <VerificationBadge
              status={m.verification?.status}
              lastChecked={m.verification?.lastChecked}
            />
          ),
        },
        {
          key: 'isDemo',
          label: 'Demo',
          render: (m) => (m.isDemo ? 'Yes' : 'No'),
        },
      ]}
      emptyForm={() => ({
        name: '',
        slug: '',
        description: '',
        modelType: 'chat',
        isOpenSource: false,
        license: '',
        contextWindowTokens: '',
        apiAvailable: false,
      })}
      fromRow={(m) => ({
        name: m.name,
        slug: m.slug,
        description: m.description ?? '',
        modelType: m.modelType,
        isOpenSource: m.isOpenSource,
        license: m.license ?? '',
        contextWindowTokens:
          m.contextWindowTokens !== null && m.contextWindowTokens !== undefined
            ? String(m.contextWindowTokens)
            : '',
        apiAvailable: m.apiAvailable,
      })}
      toPayload={(f) => ({
        name: f.name,
        slug: f.slug,
        description: f.description || null,
        modelType: f.modelType,
        isOpenSource: f.isOpenSource,
        license: f.license || null,
        contextWindowTokens: f.contextWindowTokens ? Number(f.contextWindowTokens) : null,
        apiAvailable: f.apiAvailable,
      })}
      FormFields={ModelFields}
    />
  );
}
