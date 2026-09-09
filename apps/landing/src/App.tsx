import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Docs from './pages/Docs';
import Commander from './pages/Commander';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/console" element={<Navigate to="/docs#operations" replace />} />
        <Route path="/commander" element={<Commander />} />
      </Routes>
    </BrowserRouter>
  );
}
