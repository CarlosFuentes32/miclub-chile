import { EnvironmentBanner } from '@miclub/ui';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CommercialDemoPage } from './pages/CommercialDemoPage';
import { ContactPage } from './pages/ContactPage';
import { LandingPage } from './pages/LandingPage';

export function App() {
  return (
    <>
      <EnvironmentBanner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<CommercialDemoPage />} />
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </HashRouter>
    </>
  );
}
