import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import PublicAttendanceViewer from './components/Public/PublicAttendanceViewer.jsx';
import PublicRegularAttendanceViewer from './components/Public/PublicRegularAttendanceViewer.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/public-attendance" element={<PublicAttendanceViewer />} />
        <Route path="/public-regular-attendance" element={<PublicRegularAttendanceViewer />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
