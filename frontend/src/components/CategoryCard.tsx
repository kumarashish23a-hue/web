import { Link } from 'react-router-dom';
import { Card } from './Card';
import type { Category } from '../types';

export function CategoryCard({ category }: { category: Category }) {
  const count = (category.websiteCount ?? 0) + (category.modelCount ?? 0);
  return (
    <Link to={`/categories/${category.slug}`} className="category-card-link">
      <Card className="category-card">
        <div className="category-icon" aria-hidden="true">
          {category.icon ?? '✦'}
        </div>
        <h3 className="category-name">{category.name}</h3>
        {category.description && (
          <p className="category-desc">{category.description}</p>
        )}
        <p className="category-count">
          {count} {count === 1 ? 'listing' : 'listings'}
        </p>
      </Card>
    </Link>
  );
}
