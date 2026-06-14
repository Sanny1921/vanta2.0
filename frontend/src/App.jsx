import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import { UIProvider } from './context/UIContext';
import Home from './pages/Home';
import Room from './pages/Room';
import PasswordVerify from './pages/PasswordVerify';
import './App.css';
import './css/UI.css';

function App() {
  const basename = window.location.pathname.startsWith('/vanta') ? '/vanta' : '';

  return (
    <BrowserRouter basename={basename}>
      <RoomProvider>
        <UIProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join/:roomId" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/join/:roomId/password" element={<PasswordVerify />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UIProvider>
      </RoomProvider>
    </BrowserRouter>
  );
}

export default App;
