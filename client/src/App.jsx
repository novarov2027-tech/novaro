import { Routes, Route } from 'react-router-dom';
import StoreLayout from './components/StoreLayout.jsx';
import Shop from './pages/Shop.jsx';
import Checkout from './pages/Checkout.jsx';
import AdminApp from './pages/admin/AdminApp.jsx';
import Orders from './pages/admin/Orders.jsx';
import Products from './pages/admin/Products.jsx';
import Categories from './pages/admin/Categories.jsx';
import Banner from './pages/admin/Banner.jsx';
import Delivery from './pages/admin/Delivery.jsx';
import SocialSettings from './pages/admin/Social.jsx';

// The shop is public (no customer accounts). The owner logs in by opening /admin.
export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Shop />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="*" element={<Shop />} />
      </Route>
      <Route path="admin" element={<AdminApp />}>
        <Route index element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="banner" element={<Banner />} />
        <Route path="delivery" element={<Delivery />} />
        <Route path="social" element={<SocialSettings />} />
      </Route>
    </Routes>
  );
}
