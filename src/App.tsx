import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import SchoolList from './pages/SchoolList';
import SchoolDetail from './pages/SchoolDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schools" element={<SchoolList />} />
          <Route path="/schools/:id" element={<SchoolDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
