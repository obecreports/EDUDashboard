import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  // Sidebar is hidden; we keep a collapsed flag for potential future use
  const [sidebarCollapsed] = useState(true);

  return (
    <div className={`layout ${sidebarCollapsed ? 'layout--sidebar-collapsed' : ''}`}>
      <Navbar />
      {/* Sidebar hidden */}
      <main className={`main-content ${sidebarCollapsed ? 'main-content--expanded' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
