import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Шле подію page_view у Google Analytics (GA4) при кожній зміні маршруту.
 * Потрібно для SPA: gtag сам не бачить переходи React Router.
 * У public/index.html конфіг ініціалізовано з { send_page_view: false },
 * тож усі перегляди (включно з першим завантаженням) шле цей компонент.
 */
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);

  return null;
}

export default AnalyticsTracker;
