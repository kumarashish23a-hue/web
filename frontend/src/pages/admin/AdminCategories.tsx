import { Link } from 'react-router-dom';
import { AdminCrud, type CrudFormProps } from './AdminCrud';
import { TextAreaField, TextField } from './fields';
import type { Category } from '../../types';

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: string;
}

function CategoryFields({ value, onChange }: CrudFormProps<CategoryForm>) {
  return (
    <>
      <TextField label="Name" value={value.name} onChange={(v) => onChange({ name: v })} required />
      <TextField label="Slug" value={value.slug} onChange={(v) => onChange({ slug: v })} required />
      <TextAreaField label="Description" value={value.description} onChange={(v) => onChange({ description: v })} />
      <TextField label="Icon (emoji)" value={value.icon} onChange={(v) => onChange({ icon: v })} placeholder="✦" />
      <TextField label="Sort order" value={value.sortOrder} onChange={(v) => onChange({ sortOrder: v })} type="number" />
    </>
  );
}

export function AdminCategories() {
  return (
    <AdminCrud<Category, CategoryForm>
      resource="categories"
      title="Categories"
      singular="category"
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (c) => <Link to={`/categories/${c.slug}`}>{c.name}</Link>,
        },
        { key: 'slug', label: 'Slug' },
        { key: 'sortOrder', label: 'Order' },
        {
          key: 'counts',
          label: 'Listings',
          render: (c) => String((c.websiteCount ?? 0) + (c.modelCount ?? 0)),
        },
      ]}
      emptyForm={() => ({ name: '', slug: '', description: '', icon: '', sortOrder: '0' })}
      fromRow={(c) => ({
        name: c.name,
        slug: c.slug,
        description: c.description ?? '',
        icon: c.icon ?? '',
        sortOrder: String(c.sortOrder),
      })}
      toPayload={(f) => ({
        name: f.name,
        slug: f.slug,
        description: f.description || null,
        icon: f.icon || null,
        sortOrder: Number(f.sortOrder) || 0,
      })}
      FormFields={CategoryFields}
    />
  );
}
