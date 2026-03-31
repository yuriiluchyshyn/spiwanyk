import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SongbookProvider } from './contexts/SongbookContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Header from './components/Header/Header';
import Login from './components/Auth/Login';
import Home from './components/Home/Home';
import SongList from './components/Songs/SongList';
import SongDetail from './components/Songs/SongDetail';
import MySongbooks from './components/Songbooks/MySongbooks';
import SongbookDetail from './components/Songbooks/SongbookDetail';
import Playlist from './components/Playlist/Playlist';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SongbookProvider>
          <Router>
            <div className="App">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<Home />} />
                  <Route path="/songs" element={<SongList />} />
                  <Route path="/songs/:id" element={<SongDetail />} />
                  <Route path="/my-songbooks" element={<MySongbooks />} />
                  <Route path="/songbooks/:id" element={<SongbookDetail />} />
                  <Route path="/playlist" element={<Playlist />} />
                </Routes>
              </main>
            </div>
          </Router>
        </SongbookProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;