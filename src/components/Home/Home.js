import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSongbook } from '../../contexts/SongbookContext';
import { songbooksAPI } from '../../services/api';
import { FiMusic, FiPlus, FiPlay, FiSkipForward, FiSkipBack, FiPause, FiMapPin, FiGlobe, FiEdit } from 'react-icons/fi';
import CreateSongbookModal from '../Songbooks/CreateSongbookModal';
import BookView from '../BookView/BookView';
import LoadingSpinner from '../Common/LoadingSpinner';
import './Home.css';

const MiniPlaylist = () => {
  const ctx = useSongbook();
  const { currentPlaylist, currentSong, isPlaying } = ctx;
  const { setIsPlaying, playNow, nextSong, prevSong } = ctx;
  if (currentPlaylist.length === 0) {
    return (
      <div className="mini-pl empty-pl">
        <FiMusic className="empty-pl-icon" />
        <p>Збірка порожня</p>
        <Link to="/songs" className="link-accent">Додати пісні →</Link>
      </div>
    );
  }
  return (
    <div className="mini-pl">
      {currentSong && (
        <div className="np-bar">
          <div className="np-info">
            <span className="np-label">Зараз грає</span>
            <span className="np-title">{currentSong.title}</span>
          </div>
          <div className="np-ctrls">
            <button onClick={prevSong} className="np-btn"><FiSkipBack /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="np-btn main">
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            <button onClick={nextSong} className="np-btn"><FiSkipForward /></button>
          </div>
        </div>
      )}
      <div className="pl-list">
        {currentPlaylist.map((s, i) => (
          <div key={s._id}
            className={'pl-item' + (currentSong?._id === s._id ? ' active' : '')}
            onClick={() => playNow(s)}>
            <span className="pl-num">{i + 1}</span>
            <span className="pl-name">{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [songbooks, setSongbooks] = useState([]);
  const [sharedSongbooks, setSharedSongbooks] = useState([]);
  const [publicSongbooks, setPublicSongbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bookSongbook, setBookSongbook] = useState(null); // для відкриття книги

  useEffect(() => {
    const load = async () => {
      try {
        if (user) {
          // Load my songbooks
          const myData = await songbooksAPI.getMy();
          setSongbooks(Array.isArray(myData) ? myData : []);

          // Load public songbooks separately
          try {
            const publicData = await songbooksAPI.getPublic();
            setPublicSongbooks(Array.isArray(publicData) ? publicData.slice(0, 6) : []);
          } catch (e) { console.error('Public error:', e); }

          // Load nearby songbooks with geolocation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  const nearbyData = await songbooksAPI.getNearby(
                    position.coords.latitude,
                    position.coords.longitude
                  );
                  setSharedSongbooks(Array.isArray(nearbyData) ? nearbyData : []);
                } catch (e) { console.error('Nearby error:', e); }
              },
              () => {} // silently ignore geolocation denial
            );
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleCreate = async (data) => {
    await songbooksAPI.create(data);
    setShowModal(false);
    const fresh = await songbooksAPI.getMy();
    setSongbooks(Array.isArray(fresh) ? fresh : []);
  };

  if (loading) return <LoadingSpinner text="Завантаження..." />;

  if (!user) {
    return (
      <div className="home-guest">
        <div className="hero">
          <div className="hero-fire">🔥</div>
          <h1>Пластовий Співаник</h1>
          <p>Збірка пластових пісень</p>
          <Link to="/login" className="cta-btn">Увійти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <section className="section">
        <div className="sec-head">
          <h2>🎵 Збірка</h2>
          <Link to="/playlist" className="link-accent">Усі →</Link>
        </div>
        <MiniPlaylist />
      </section>

      <section className="section">
        <div className="sec-head">
          <h2>📚 Мої співаники</h2>
        </div>
        <div className="sb-grid">
          <button className="sb-card add-card" onClick={() => setShowModal(true)}>
            <FiPlus className="add-icon" />
            <span>Новий співаник</span>
          </button>
          {songbooks.map(sb => (
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
        <section className="section">
          <div className="sec-head">
            <h2><FiMapPin className="sec-icon" /> Розшарені співаники</h2>
            <span className="sec-subtitle">Поблизу вас</span>
          </div>
          <div className="sb-grid">
            {sharedSongbooks.map(sb => (
              <Link key={sb._id} to={'/songbooks/' + sb._id} className="sb-card shared">
                <div className="sb-header">
                  <span className="sb-name">{sb.title}</span>
                  <FiMapPin className="shared-icon" />
                </div>
                <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {publicSongbooks.length > 0 && (
        <section className="section">
          <div className="sec-head">
            <h2><FiGlobe className="sec-icon" /> Публічні співаники</h2>
          </div>
          <div className="sb-grid">
            {publicSongbooks.map(sb => (
              <Link key={sb._id} to={'/songbooks/' + sb._id} className="sb-card public">
                <span className="sb-name">{sb.title}</span>
                <span className="sb-cnt">{sb.songs?.length || 0} пісень</span>
              </Link>
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
