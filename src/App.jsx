import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppLayout } from './components/layout/index.js';
import Quote from './pages/public/Quote.jsx';
import Login from './pages/auth/Login.jsx';
import Overview from './pages/dashboard/Overview.jsx';
import Leads from './pages/dashboard/Leads.jsx';
import Campaigns from './pages/dashboard/Campaigns.jsx';
import CampaignDetail from './pages/dashboard/CampaignDetail.jsx';
import Quotes from './pages/dashboard/Quotes.jsx';
import Jobs from './pages/dashboard/Jobs.jsx';
import Schedule from './pages/dashboard/Schedule.jsx';
import Templates from './pages/templates/Templates.jsx';
import TemplateEditor from './pages/templates/TemplateEditor.jsx';
import Portal from './pages/dashboard/Portal.jsx';
import Settings from './pages/dashboard/Settings.jsx';
import Billing from './pages/dashboard/Billing.jsx';
import ImageRender from './pages/image-render/ImageRender.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-page"><span className="spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/image-render" element={<ImageRender />} />
      <Route path="/quote/:id" element={<Quote />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Overview />} />
        <Route path="leads" element={<Leads />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="templates" element={<Templates />} />
        <Route path="templates/:id" element={<TemplateEditor />} />
        <Route path="portal" element={<Portal />} />
        <Route path="settings" element={<Settings />} />
        <Route path="billing" element={<Billing />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
