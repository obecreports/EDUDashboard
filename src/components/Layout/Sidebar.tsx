import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  BarChart3,
  Settings,
  FileText,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schools', icon: School, label: 'รายชื่อโรงเรียน' },
  { to: '#', icon: BarChart3, label: 'สถิติรวม' },
  { to: '#', icon: FileText, label: 'รายงาน' },
];

const settingsItems = [
  { to: '#', icon: Database, label: 'ฐานข้อมูล' },
  { to: '#', icon: Settings, label: 'ตั้งค่า' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Collapse toggle */}
      <button className="sidebar__toggle" onClick={onToggle} title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}>
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {!collapsed && <div className="sidebar__section-title">เมนูหลัก</div>}
      <ul className="sidebar__menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="sidebar__icon" size={20} />
                {!collapsed && <span className="sidebar__label">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      {!collapsed && <div className="sidebar__section-title" style={{ marginTop: '12px' }}>จัดการ</div>}
      {collapsed && <div style={{ borderTop: '1px solid var(--border)', margin: '8px 12px' }} />}
      <ul className="sidebar__menu">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className="sidebar__item"
                title={collapsed ? item.label : undefined}
              >
                <Icon className="sidebar__icon" size={20} />
                {!collapsed && <span className="sidebar__label">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
