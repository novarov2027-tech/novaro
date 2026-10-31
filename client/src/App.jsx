import { Routes, Route } from 'react-router-dom';
import StoreLayout from './components/StoreLayout.jsx';
import Guard from './components/Guard.jsx';
import Shop from './pages/Shop.jsx';
import Login from './pages/Login.jsx';
import Checkout from './pages/Checkout.jsx';
import MyOrders from './pages/MyOrders.jsx';
import Account from './pages/Account.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Orders from './pages/admin/Orders.jsx';
import Products from './pages/admin/Products.jsx';
import Categories from './pages/admin/Categories.jsx';
import Banner from './pages/admin/Banner.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Shop />} />
        <Route path="login" element={<Login />} />
        <Route path="checkout" element={<Guard><Checkout /></Guard>} />
        <Route path="orders" element={<Guard><MyOrders /></Guard>} />
        <Route path="account" element={<Guard><Account /></Guard>} />
      </Route>
      <Route path="admin" element={<Guard owner><AdminLayout /></Guard>}>
        <Route index element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="banner" element={<Banner />} />
      </Route>
      <Route path="*" element={<StoreLayout />} />
    </Routes>
  );
}
