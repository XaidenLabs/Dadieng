import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Docs from './pages/Docs';
import Console from './pages/Console';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/console" element={<Console />} />
      </Routes>
    </BrowserRouter>
  );
}
