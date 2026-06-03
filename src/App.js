import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Header from './components/Header/Header';
import Login from './components/Auth/Login';
import Home from './components/Home/Home';
import SongList from './components/Songs/SongList';
import SongDetail from './components/Songs/SongDetail';
import MySongbooks from './components/Songbooks/MySongbooks';
import SongbookDetail from './components/Songbooks/SongbookDetail';
import AdminPanel from './components/Admin/AdminPanel';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
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
                <Route path="/admin-songs-panel" element={<AdminPanel />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
