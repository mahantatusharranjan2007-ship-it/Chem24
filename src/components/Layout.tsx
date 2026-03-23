import { Outlet, Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-indigo-600 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <img 
                src="https://dduniversity.ac.in/wp-content/uploads/2024/02/DD-Logo-2.png" 
                alt="Dharanidhar University Logo" 
                className="h-10 w-auto bg-white rounded-full p-1"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight tracking-tight">Dharanidhar University</span>
                <span className="text-xs font-medium text-indigo-200">BSc Hons Chemistry • Class of 2024</span>
              </div>
            </Link>
            <div className="flex items-center">
              {user ? (
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 text-sm font-medium hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              ) : (
                <button 
                  onClick={login}
                  className="flex items-center space-x-2 text-sm font-medium hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-slate-800 text-slate-400 py-8 text-center mt-auto">
        <p>&copy; {new Date().getFullYear()} Dharanidhar University, Keonjhar. All rights reserved.</p>
      </footer>
    </div>
  );
}
