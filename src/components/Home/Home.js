import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { songbooksAPI } from '../../services/api';
import { FiPlus, FiMapPin, FiGlobe, FiEdit } from 'react-icons/fi';
import CreateSongbookModal from '../Songbooks/CreateSongbookModal';
import BookView from '../BookView/BookView';
import MusicalNoteLoader from '../Common/MusicalNoteLoader';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const [songbooks, setSongbooks] = useState([]);
  const [sharedSongbooks, setSharedSongbooks] = useState([]);
  const [publicSongbooks, setPublicSongbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bookSongbook, setBookSongbook] = useState(null); // для відкриття книги

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let refreshTimer = null;

    // How often we re-announce our presence and re-check who is nearby.
    // Must be well below the backend presence window (60 min) so our own
    // location never goes stale while we sit at the campfire.
    const REFRESH_INTERVAL_MS = 45 * 1000;

    // Announce our current position and pull songbooks shared by people
    // physically near us right now. Runs on mount and on every interval tick.
    const refreshNearby = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const { latitude, longitude } = position.coords;
          try {
            // Update our own location so others nearby can find us, and so
            // our presence stays "fresh" on the backend.
            const { locationAPI } = await import('../../services/api');
            await locationAPI.updateLocation(latitude, longitude).catch(() => {});

            const nearbyData = await songbooksAPI.getNearby(latitude, longitude, window.location.search.includes('debugNearby=true'));
            if (!cancelled) {
              setSharedSongbooks(Array.isArray(nearbyData) ? nearbyData : []);
            }
          } catch (e) {
            console.error('Nearby error:', e);
          }
        },
        () => {}, // silently ignore geolocation denial
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
      );
    };

    const load = async () => {
      try {
        // Load my songbooks
        const myData = await songbooksAPI.getMy();
        if (!cancelled) setSongbooks(Array.isArray(myData) ? myData : []);

        // Load public songbooks separately
        try {
          const publicData = await songbooksAPI.getPublic();
          const filteredPublic = Array.isArray(publicData) ? publicData.filter(sb => {
            return sb.owner?._id !== user?._id && sb.owner?.email !== user?.email;
          }) : [];
          if (!cancelled) setPublicSongbooks(filteredPublic.slice(0, 6));
        } catch (e) { console.error('Public error:', e); }

        // Live nearby songbooks: initial fetch + periodic refresh so new
        // arrivals show up and our presence doesn't expire.
        refreshNearby();
        refreshTimer = setInterval(refreshNearby, REFRESH_INTERVAL_MS);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [user]);

  const handleCreate = async (data) => {
    await songbooksAPI.create(data);
    setShowModal(false);
    const fresh = await songbooksAPI.getMy();
    setSongbooks(Array.isArray(fresh) ? fresh : []);
  };

  if (loading) return <MusicalNoteLoader text="Завантаження..." />;

  if (!user) {
    return (
      <div className="home-guest">
        <div className="hero">
          <div className="hero-fire">🔥</div>
          <h1>Співаник Твоєї Душі</h1>
          <p>Збірка українських пісень</p>
          <Link to="/login" className="cta-btn">Увійти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
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
            <div key={sb._id} className="sb-card" onClick={() => setBookSongbook(sb)}>
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
            </div>
          ))}
        </div>
      </section>

      {sharedSongbooks.length > 0 && (
        <section className="section" id="shared-songbooks">
          <div className="sec-head">
            <h2><FiMapPin className="sec-icon" /> Розшарені співаники</h2>
            <span className="sec-subtitle">Поблизу вас</span>
          </div>
          <div className="sb-grid">
            {sharedSongbooks
              .filter(sb => sb.isActive !== false) // Фільтруємо видалені співаники
              .map(sb => (
              <div key={sb._id} className="sb-card shared" onClick={() => setBookSongbook(sb)}>
                <div className="sb-header">
                  <span className="sb-name">{sb.title}</span>
                  <FiMapPin className="shared-icon" />
                </div>
                <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
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
              <div key={sb._id} className="sb-card public" onClick={() => setBookSongbook(sb)}>
                <span className="sb-name">{sb.title}</span>
                <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
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

      {bookSongbook && (
        <BookView
          onClose={() => setBookSongbook(null)}
          songbookData={bookSongbook}
        />
      )}
    </div>
  );
};

export default Home;
