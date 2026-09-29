import type { Category, SearchFilters } from '../types';
import { Button } from './Button';

export const EMPTY_FILTERS: SearchFilters = {
  q: '',
  price: 'any',
  access: 'any',
  noCard: false,
  noPayment: false,
  noLogin: false,
  category: '',
  region: '',
};

export function FilterPanel({
  filters,
  onChange,
  categories,
  onReset,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  categories: Category[];
  onReset: () => void;
}) {
  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <aside className="filter-panel" aria-label="Search filters">
      <div className="filter-head">
        <h3>Filters</h3>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      <div className="field">
        <label htmlFor="f-price">Price</label>
        <select
          id="f-price"
          className="select"
          value={filters.price}
          onChange={(e) => set('price', e.target.value as SearchFilters['price'])}
        >
          <option value="any">Any price</option>
          <option value="free">Free options only</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="f-access">Access</label>
        <select
          id="f-access"
          className="select"
          value={filters.access}
          onChange={(e) => set('access', e.target.value as SearchFilters['access'])}
        >
          <option value="any">Any access</option>
          <option value="free">Free</option>
          <option value="free_tier">Free tier</option>
          <option value="free_trial">Free trial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <fieldset className="filter-group">
        <legend>Requirements</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.noCard}
            onChange={(e) => set('noCard', e.target.checked)}
          />
          No credit card required
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.noPayment}
            onChange={(e) => set('noPayment', e.target.checked)}
          />
          No payment required
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.noLogin}
            onChange={(e) => set('noLogin', e.target.checked)}
          />
          No login required
        </label>
      </fieldset>

      <div className="field">
        <label htmlFor="f-category">Category</label>
        <select
          id="f-category"
          className="select"
          value={filters.category}
          onChange={(e) => set('category', e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="f-region">Region (country code)</label>
        <input
          id="f-region"
          className="input"
          value={filters.region}
          onChange={(e) => set('region', e.target.value.toUpperCase().slice(0, 2))}
          placeholder="e.g. US, IN, GB"
          maxLength={2}
        />
      </div>
    </aside>
  );
}
