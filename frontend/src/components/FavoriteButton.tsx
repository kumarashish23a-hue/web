import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritesApi, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { Button } from './Button';

/**
 * Heart toggle for websites / models / stacks. Requires login.
 * Parent supplies `isFavorite` + `favoriteId` when it already knows them
 * (e.g. the Favorites page); otherwise the button is a simple "add".
 */
export function FavoriteButton({
  kind,
  entityId,
  knownFavoriteId,
  onChanged,
}: {
  kind: 'website' | 'model' | 'stack';
  entityId: string;
  knownFavoriteId?: string | null;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favoriteId, setFavoriteId] = useState<string | null>(
    knownFavoriteId ?? null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFavoriteId(knownFavoriteId ?? null);
  }, [knownFavoriteId]);

  const toggle = async () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    setBusy(true);
    try {
      if (favoriteId) {
        await favoritesApi.remove(favoriteId);
        setFavoriteId(null);
        toast('Removed from your saved items.', 'info');
      } else {
        const { data } = await favoritesApi.add(kind, entityId);
        setFavoriteId(data.id);
        toast('Saved to your favorites.', 'success');
      }
      onChanged?.();
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : 'Could not update favorites.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={toggle}
      disabled={busy}
      aria-pressed={favoriteId !== null}
      title={favoriteId ? 'Remove from favorites' : 'Save to favorites'}
    >
      {favoriteId ? '♥ Saved' : '♡ Save'}
    </Button>
  );
}
