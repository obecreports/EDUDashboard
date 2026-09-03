import { Link, useLocation } from 'react-router-dom';
import { School, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'หน้าหลัก', icon: LayoutDashboard },
    { to: '/schools', label: 'โรงเรียน', icon: School },
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="navbar__brand-icon">
          <School size={22} />
        </div>
        <div>
          <div>ConED</div>
          <div className="navbar__brand-subtitle">ระบบจัดเก็บข้อมูลโรงเรียนในสังกัด</div>
        </div>
      </Link>

      <ul className="navbar__nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`navbar__link ${isActive ? 'navbar__link--active' : ''}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
