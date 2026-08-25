import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`layout ${sidebarCollapsed ? 'layout--sidebar-collapsed' : ''}`}>
      <Navbar />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`main-content ${sidebarCollapsed ? 'main-content--expanded' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
