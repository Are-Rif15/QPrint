import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireOwner from './components/RequireOwner.jsx';
import Home from './pages/Home.jsx';
import NewOrder from './pages/NewOrder.jsx';
import NotFound from './pages/NotFound.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import OwnerLogin from './pages/OwnerLogin.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="order/new" element={<NewOrder />} />
        <Route path="owner/login" element={<OwnerLogin />} />

        {/* RequireOwner renders an <Outlet /> only for signed-in owners. */}
        <Route path="owner" element={<RequireOwner />}>
          <Route index element={<OwnerDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
