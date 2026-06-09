import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import Home from './pages/Home';
import Room from './pages/Room';
import PasswordVerify from './pages/PasswordVerify';
import './App.css';

function App() {
  return (
    <BrowserRouter basename="/vanta">
      <RoomProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:roomId" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/join/:roomId/password" element={<PasswordVerify />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RoomProvider>
    </BrowserRouter>
  );
}

export default App;
