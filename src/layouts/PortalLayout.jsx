import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import PortalSidebar from '../components/portal/PortalSidebar';
import PortalHeader from '../components/portal/PortalHeader';
import { ChevronRight, Home } from 'lucide-react';

export default function PortalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Extract section title from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSegment = pathSegments[pathSegments.length - 1] || 'dashboard';
  
  const formatTitle = (str) => {
    return str
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Sidebar */}
      <PortalSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Wrapper */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <PortalHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Breadcrumb Navigation Bar (Simple Banking/Google Drive style) */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 flex items-center gap-2 text-xs text-slate-500">
          <Link to="/portal/dashboard" className="flex items-center gap-1 hover:text-brand-primary">
            <Home className="w-3.5 h-3.5" />
            <span>Portal</span>
          </Link>
          {pathSegments.length > 1 && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800 capitalize">
                {formatTitle(currentSegment)}
              </span>
            </>
          )}
        </div>

        {/* Page Main Content Area */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
