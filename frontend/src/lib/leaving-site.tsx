import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Modal } from '../components/Modal';
import { trackEvent, type TrackOptions } from './analytics';

/**
 * Leaving-site interstitial (CONTRACT requirement): every click on an
 * official website URL opens a confirm modal — "You are leaving this
 * platform." — showing the destination URL, and only opens it in a new
 * tab after the user confirms.
 *
 * Analytics: when the user confirms, an `external_website_clicked` event is
 * fired (failure-silent). Callers can attach coarse entity context so the
 * click is attributed to the website/model the link belonged to.
 */
interface LeavingSiteContextValue {
  openExternal: (url: string, analytics?: TrackOptions) => void;
}

const LeavingSiteContext = createContext<LeavingSiteContextValue | null>(null);

export function LeavingSiteProvider({ children }: { children: ReactNode }) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingAnalytics, setPendingAnalytics] = useState<TrackOptions | undefined>(undefined);

  const openExternal = useCallback((url: string, analytics?: TrackOptions) => {
    if (!url) return;
    setPendingUrl(url);
    setPendingAnalytics(analytics);
  }, []);

  const confirm = useCallback(() => {
    if (pendingUrl) {
      trackEvent('external_website_clicked', pendingAnalytics);
      window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    }
    setPendingUrl(null);
    setPendingAnalytics(undefined);
  }, [pendingUrl, pendingAnalytics]);

  const cancel = useCallback(() => {
    setPendingUrl(null);
    setPendingAnalytics(undefined);
  }, []);

  const value = useMemo(() => ({ openExternal }), [openExternal]);

  return (
    <LeavingSiteContext.Provider value={value}>
      {children}
      <Modal
        open={pendingUrl !== null}
        onClose={cancel}
        title="You are leaving this platform."
        actions={[
          { label: 'Stay here', onClick: cancel, variant: 'secondary' },
          { label: 'Continue to site', onClick: confirm, variant: 'primary' },
        ]}
      >
        <p className="leaving-text">
          You are about to visit an external website. We are not responsible for
          its content, pricing, or privacy practices.
        </p>
        <p className="leaving-url">
          <span className="leaving-url-label">Destination:</span>
          <code>{pendingUrl}</code>
        </p>
      </Modal>
    </LeavingSiteContext.Provider>
  );
}

export function useLeavingSite(): LeavingSiteContextValue {
  const ctx = useContext(LeavingSiteContext);
  if (!ctx) throw new Error('useLeavingSite must be used inside <LeavingSiteProvider>');
  return ctx;
}

/** Anchor that routes external URLs through the leaving-site interstitial. */
export function ExternalLink({
  href,
  children,
  className,
  analytics,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Coarse entity context attached to the `external_website_clicked` event. */
  analytics?: TrackOptions;
}) {
  const { openExternal } = useLeavingSite();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openExternal(href, analytics);
  };
  return (
    <a href={href} onClick={onClick} className={className} rel="noopener noreferrer">
      {children}
    </a>
  );
}
