import { useState, type FormEvent } from 'react';
import { Button } from './Button';

export function SearchBar({
  initial = '',
  onSearch,
  placeholder = 'Search AI websites and models…',
}: {
  initial?: string;
  onSearch: (q: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };

  return (
    <form className="search-bar" onSubmit={submit} role="search">
      <input
        type="search"
        className="input search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
