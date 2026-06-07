import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { RacePage } from '@/pages/RacePage';
import { attachController } from '@/controllers/training-controller';

export default function App() {
  useEffect(() => {
    const detach = attachController();
    return detach;
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/workspace/:algoId" element={<WorkspacePage />} />
      <Route path="/race" element={<RacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
