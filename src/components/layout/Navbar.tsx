import React from 'react';
import { Book as Roof, LogOut, Plus, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onNewJob: () => void;
  activeView: 'week' | 'month';
  setActiveView: (view: 'week' | 'month') => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNewJob, activeView, setActiveView }) => {
  const { signOut, currentWorker, isAdmin } = useAuth();

  return (
    <nav className="bg-[#0a2342] shadow-md">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Roof className="h-8 w-8 text-white" />
            <span className="ml-2 text-white font-semibold text-lg">Tasman Roofing</span>
            
            {currentWorker && (
              <div className="ml-4 flex items-center">
                <span className="text-white/70 text-sm mr-2">
                  {currentWorker.name}
                </span>
                {!isAdmin && (
                  <div className="bg-amber-500/80 text-white text-xs px-2 py-0.5 rounded-full flex items-center">
                    <Shield size={10} className="mr-1" />
                    View Only
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 rounded-lg p-1">
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'week'
                    ? 'bg-white text-[#0a2342]'
                    : 'text-white hover:bg-white/20'
                }`}
                onClick={() => setActiveView('week')}
              >
                Week
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'month'
                    ? 'bg-white text-[#0a2342]'
                    : 'text-white hover:bg-white/20'
                }`}
                onClick={() => setActiveView('month')}
              >
                Month
              </button>
            </div>
            
            {isAdmin && (
              <button
                onClick={onNewJob}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Job
              </button>
            )}
            
            <button
              onClick={() => signOut()}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;