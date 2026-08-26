import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NowSingingProvider } from './contexts/NowSingingContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Header from './components/Header/Header';
import GlobalBookView from './components/NowSinging/GlobalBookView';
import Settings from './components/Settings/Settings';
import Login from './components/Auth/Login';
import Home from './components/Home/Home';
import SongList from './components/Songs/SongList';
import SongDetail from './components/Songs/SongDetail';
import SongbookDetail from './components/Songbooks/SongbookDetail';
import AdminPanel from './components/Admin/AdminPanel';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <NowSingingProvider>
              <div className="App">
                <Header />
                <main className="main-content">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/songs" element={<SongList />} />
                    <Route path="/songs/:id" element={<SongDetail />} />
                    <Route path="/songbooks/:id" element={<SongbookDetail />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin-songs-panel" element={<AdminPanel />} />
                  </Routes>
                </main>
                <GlobalBookView />
              </div>
            </NowSingingProvider>
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
