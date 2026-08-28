import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { songbooksAPI } from '../../services/api';
import { FiPlus, FiMapPin, FiGlobe, FiEdit, FiUsers } from 'react-icons/fi';
import CreateSongbookModal from '../Songbooks/CreateSongbookModal';
import MusicalNoteLoader from '../Common/MusicalNoteLoader';
import Seo from '../Common/Seo';
import { useNowSinging } from '../../contexts/NowSingingContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const { openBook: openBookGlobal } = useNowSinging();
  const [songbooks, setSongbooks] = useState([]);
  const [sharedWithMe, setSharedWithMe] = useState([]); // розшарені по email
  const [sharedSongbooks, setSharedSongbooks] = useState([]); // поблизу (nearby)
  const [publicSongbooks, setPublicSongbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Tracks whether the component is still mounted so async geolocation
  // callbacks don't set state after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Announce our current position and pull songbooks shared by people
  // physically near us right now. Component-level so both the periodic
  // refresh (useEffect) and the manual "allow geolocation" button can call it.
  const refreshNearby = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Refreshing nearby songbooks...');
    }
    if (!navigator.geolocation) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Geolocation not available in this browser');
      }
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!mountedRef.current) return;
        const { latitude, longitude } = position.coords;
        if (process.env.NODE_ENV === 'development') {
          console.log(`📍 Got position: ${latitude}, ${longitude}`);
        }
        try {
          // Update our own location so others nearby can find us, and so
          // our presence stays "fresh" on the backend.
          const { locationAPI } = await import('../../services/api');
          await locationAPI.updateLocation(latitude, longitude).catch(() => {});
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Location updated on server');
          }

          const nearbyData = await songbooksAPI.getNearby(latitude, longitude);
          if (process.env.NODE_ENV === 'development') {
            console.log('📚 Nearby songbooks response:', nearbyData);
          }
          if (mountedRef.current) {
            setSharedSongbooks(Array.isArray(nearbyData) ? nearbyData : []);
            if (process.env.NODE_ENV === 'development') {
              console.log(`📋 Set ${nearbyData?.length || 0} nearby songbooks`);
            }
          }
        } catch (e) {
          console.error('❌ Nearby error:', e);
        }
      },
      (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Geolocation error details:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
            TIMEOUT: error.TIMEOUT
          });
        }

        // Показати користувачу пояснення проблеми (тільки в розробці)
        if (process.env.NODE_ENV === 'development') {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.log('💡 Геолокація заблокована. Перевірте налаштування браузера або натисніть на іконку замка біля адресного рядка');
              break;
            case error.POSITION_UNAVAILABLE:
              console.log('💡 Місцезнаходження недоступне. Спробуйте пізніше');
              break;
            case error.TIMEOUT:
              console.log('💡 Тайм-аут запиту геолокації. Спробуйте перезавантажити сторінку');
              break;
            default:
              break;
          }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000
      }
    );
  }, []);

  // Fetch my / shared-with-me / public lists. Reused for the initial load and
  // for the periodic "who is singing now" refresh, so the badges stay live.
  const loadLists = useCallback(async () => {
    try {
      const myData = await songbooksAPI.getMy();
      if (mountedRef.current) setSongbooks(Array.isArray(myData) ? myData : []);
    } catch (e) { console.error('My songbooks error:', e); }

    try {
      const sharedData = await songbooksAPI.getSharedWithMe();
      if (mountedRef.current) setSharedWithMe(Array.isArray(sharedData) ? sharedData : []);
    } catch (e) { console.error('Shared-with-me error:', e); }

    try {
      const publicData = await songbooksAPI.getPublic();
      const filteredPublic = Array.isArray(publicData) ? publicData.filter(sb => {
        return sb.owner?._id !== user?._id && sb.owner?.email !== user?.email;
      }) : [];
      if (mountedRef.current) setPublicSongbooks(filteredPublic.slice(0, 6));
    } catch (e) { console.error('Public error:', e); }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let refreshTimer = null;
    let singingTimer = null;

    // How often we re-announce our presence and re-check who is nearby.
    // Must be well below the backend presence window (60 min) so our own
    // location never goes stale while we sit at the campfire.
    const REFRESH_INTERVAL_MS = 45 * 1000;
    // How often we re-pull the lists so the "singing now" badges update for
    // everyone without needing a page reload.
    const SINGING_REFRESH_MS = 10 * 1000;

    const load = async () => {
      try {
        await loadLists();

        // Live nearby songbooks: initial fetch + periodic refresh so new
        // arrivals show up and our presence doesn't expire.
        refreshNearby();
        refreshTimer = setInterval(refreshNearby, REFRESH_INTERVAL_MS);

        // Keep the singing badges fresh across all list types.
        singingTimer = setInterval(() => {
          if (cancelled) return;
          loadLists();
          refreshNearby();
        }, SINGING_REFRESH_MS);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
      if (singingTimer) clearInterval(singingTimer);
    };
  }, [user, refreshNearby, loadLists]);

  const handleCreate = async (data) => {
    await songbooksAPI.create(data);
    setShowModal(false);
    const fresh = await songbooksAPI.getMy();
    setSongbooks(Array.isArray(fresh) ? fresh : []);
  };

  // Чи може поточний користувач редагувати цей співаник.
  // Дублює логіку canEdit() у SongbookDetail та canAccess() на бекенді,
  // щоб показати кнопку редагування на картках, які не належать користувачу
  // (публічні / поблизу / розшарені), коли власник надав права на редагування.
  const canEditSongbook = (sb) => {
    if (!user || !sb) return false;

    // Власник завжди може редагувати
    const ownerId = sb.owner?._id ? sb.owner._id.toString() : sb.owner?.toString();
    if (ownerId && user._id && ownerId === user._id.toString()) return true;
    if (sb.owner?.email && user.email && sb.owner.email === user.email) return true;

    // Явні права на редагування (розшарено по email): edit або full
    const sharedEntry = sb.sharedWith?.find(
      (s) => s.email === user.email?.toLowerCase()
    );
    if (sharedEntry && (sharedEntry.permissions === 'edit' || sharedEntry.permissions === 'full')) {
      return true;
    }

    // Публічні та nearby співаники — дивимось defaultPermissions (edit або full)
    if (
      (sb.privacy === 'public' || sb.privacy === 'nearby') &&
      (sb.defaultPermissions === 'edit' || sb.defaultPermissions === 'full')
    ) {
      return true;
    }

    return false;
  };

  // Свіжий маркер "співають зараз" (той самий строк давності, що й на бекенді:
  // 10 хв), або null. Після цього спів зникає з нотіфікацій у всіх.
  const NOW_SINGING_WINDOW_MS = 10 * 60 * 1000;
  const getActiveSinging = (sb) => {
    const ns = sb?.nowSinging;
    if (!ns || !ns.songId || !ns.startedAt) return null;
    if (Date.now() - new Date(ns.startedAt).getTime() > NOW_SINGING_WINDOW_MS) return null;
    return ns;
  };

  // Відкриваємо книгу через глобальний контекст; якщо scrollToSinging —
  // одразу скролимо до пісні, яку співають зараз.
  const openBook = (sb, scrollToSinging = false) => {
    const singing = scrollToSinging ? getActiveSinging(sb) : null;
    openBookGlobal(sb._id, singing?.songId || null);
  };

  // Чи веде спів саме поточний користувач (зелений), чи хтось інший (жовтий).
  const isSingingMine = (singing) =>
    !!user?.email && singing?.startedByEmail === user.email;

  // Клас картки: підсвітка залежить від того, хто веде спів.
  const singingCardClass = (sb) => {
    const singing = getActiveSinging(sb);
    if (!singing) return '';
    return isSingingMine(singing) ? 'is-singing singing-mine' : 'is-singing';
  };

  const renderSingingBadge = (sb) => {
    const singing = getActiveSinging(sb);
    if (!singing) return null;
    const mine = isSingingMine(singing);
    return (
      <button
        type="button"
        className={`sb-singing-badge ${mine ? 'mine' : ''}`}
        title="Перейти до пісні, яку співають зараз"
        onClick={(e) => {
          e.stopPropagation();
          openBook(sb, true);
        }}
      >
        <FiUsers className="sb-singing-icon" />
        <span className="sb-singing-text">
          <span className="sb-singing-title">{singing.songTitle || 'пісню'}</span>
        </span>
      </button>
    );
  };

  if (loading) return <MusicalNoteLoader text="Завантаження..." />;

  if (!user) {
    return (
      <div className="home-guest">
        <Seo
          title="Давай співати — збірка українських пісень з акордами"
          description="Кантичка — давай співати! Колекція українських пісень зі словами та акордами. Створюйте власні співаники, діліться ними та співайте разом."
          path="/"
        />
        <div className="hero">
          <div className="hero-fire">🔥</div>
          <h1>Кантичка</h1>
          <p className="hero-tagline">Давай співати</p>
          <p>Збірка українських пісень</p>
          <Link to="/login" className="cta-btn">Увійти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <Seo
        title="Давай співати — збірка українських пісень з акордами"
        description="Кантичка — давай співати! Колекція українських пісень зі словами та акордами. Створюйте власні співаники, діліться ними та співайте разом."
        path="/"
      />
      <section className="section" id="my-songbooks">
        <div className="sec-head">
          <h2>📚 Мої співаники</h2>
        </div>
        <div className="sb-grid">
          <button className="sb-card add-card" onClick={() => setShowModal(true)}>
            <FiPlus className="add-icon" />
            <span>Новий співаник</span>
          </button>
          {songbooks
            .filter(sb => sb.isActive !== false) // Фільтруємо видалені співаники
            .map(sb => (
            <div
              key={sb._id}
              className={`sb-card ${singingCardClass(sb)}`}
              onClick={() => openBook(sb, false)}
            >
              <div className="sb-header">
                <span className="sb-name">{sb.title}</span>
                <Link
                  to={'/songbooks/' + sb._id}
                  className="sb-edit-btn"
                  onClick={(e) => e.stopPropagation()}
                  title="Редагувати"
                >
                  <FiEdit />
                </Link>
              </div>
              <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
              {renderSingingBadge(sb)}
            </div>
          ))}
        </div>
      </section>

      {sharedWithMe.length > 0 && (
        <section className="section" id="shared-with-me">
          <div className="sec-head">
            <h2><FiUsers className="sec-icon" /> Поділилися з вами</h2>
            <span className="sec-subtitle">Запрошення по email</span>
          </div>
          <div className="sb-grid">
            {sharedWithMe
              .filter(sb => sb.isActive !== false)
              .map(sb => (
              <div
                key={sb._id}
                className={`sb-card shared ${singingCardClass(sb)}`}
                onClick={() => openBook(sb, false)}
              >
                <div className="sb-header">
                  <span className="sb-name">{sb.title}</span>
                  {canEditSongbook(sb) ? (
                    <Link
                      to={'/songbooks/' + sb._id}
                      className="sb-edit-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Редагувати"
                    >
                      <FiEdit />
                    </Link>
                  ) : (
                    <FiUsers className="shared-icon" />
                  )}
                </div>
                <span className="sb-cnt">
                  {sb.songs?.length || 0} пісень
                  {sb.owner?.email ? ` · ${sb.owner.email}` : ''}
                </span>
                {renderSingingBadge(sb)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Секція nearby співаників */}
      {sharedSongbooks.length > 0 && (
        <section className="section" id="shared-songbooks">
          <div className="sec-head">
            <h2><FiMapPin className="sec-icon" /> Співаники поблизу</h2>
            <span className="sec-subtitle">Співаники біля вас прямо зараз</span>
          </div>
          <div className="sb-grid">
            {sharedSongbooks
              .filter(sb => sb.isActive !== false) // Фільтруємо видалені співаники
              .map(sb => (
              <div
                key={sb._id}
                className={`sb-card shared ${singingCardClass(sb)}`}
                onClick={() => openBook(sb, false)}
              >
                <div className="sb-header">
                  <span className="sb-name">{sb.title}</span>
                  {canEditSongbook(sb) ? (
                    <Link
                      to={'/songbooks/' + sb._id}
                      className="sb-edit-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Редагувати"
                    >
                      <FiEdit />
                    </Link>
                  ) : (
                    <FiMapPin className="shared-icon" />
                  )}
                </div>
                <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
                {renderSingingBadge(sb)}
              </div>
            ))}
          </div>
        </section>
      )}

      {publicSongbooks.length > 0 && (
        <section className="section" id="public-songbooks">
          <div className="sec-head">
            <h2><FiGlobe className="sec-icon" /> Публічні співаники</h2>
          </div>
          <div className="sb-grid">
            {publicSongbooks
              .filter(sb => sb.isActive !== false) // Фільтруємо видалені співаники
              .map(sb => (
              <div
                key={sb._id}
                className={`sb-card public ${singingCardClass(sb)}`}
                onClick={() => openBook(sb, false)}
              >
                <div className="sb-header">
                  <span className="sb-name">{sb.title}</span>
                  {canEditSongbook(sb) ? (
                    <Link
                      to={'/songbooks/' + sb._id}
                      className="sb-edit-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Редагувати"
                    >
                      <FiEdit />
                    </Link>
                  ) : (
                    <FiGlobe className="shared-icon" />
                  )}
                </div>
                <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
                {renderSingingBadge(sb)}
              </div>
            ))}
          </div>
        </section>
      )}

      {showModal && (
        <CreateSongbookModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}

    </div>
  );
};

export default Home;
