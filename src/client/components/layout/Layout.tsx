import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { cn, formatBytes } from '../../lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const used = user?.storageUsed ? Number(user.storageUsed) : 0;
  const quota = user?.storageQuota ? Number(user.storageQuota) : 0;
  const percentage = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

  const navItems = [
    { label: '记忆列表', path: '/' },
    { label: '新建记忆', path: '/new' },
    { label: '回顾', path: '/review' },
    ...(user?.role === 'ADMIN' ? [{ label: '管理面板', path: '/admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-primary-600">MemMe</Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                      location.pathname === item.path
                        ? "border-primary-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="ml-3 relative flex items-center gap-4">
                <div className="flex flex-col items-end mr-2">
                  <span className="text-sm text-gray-700 font-medium">{user?.username}</span>
                  <div className="flex items-center gap-2" title={`已用 ${formatBytes(used)} / ${formatBytes(quota)}`}>
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", percentage > 90 ? "bg-red-500" : "bg-primary-500")} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatBytes(used)}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Handle export
                    fetch('/api/export/download', {
                      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
                    })
                    .then(res => res.blob())
                    .then(blob => {
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `memme-export-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    });
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  导出数据
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  退出
                </button>
              </div>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <span className="sr-only">Open main menu</span>
                {/* Icon for menu */}
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                    location.pathname === item.path
                      ? "bg-primary-50 border-primary-500 text-primary-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
              >
                退出
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
