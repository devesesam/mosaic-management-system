import React, { useState } from 'react';
import { LogOut, Plus, Settings } from 'lucide-react';
import mosaicLogo from '../../assets/MosaicLogo.png';
import { useAuth } from '../../context/AuthContext';
import UserSettingsModal from './UserSettingsModal';

interface NavbarProps {
  onNewTask: () => void;
  activeView: 'week' | 'month';
  setActiveView: (view: 'week' | 'month') => void;
  isEditable: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onNewTask, activeView, setActiveView, isEditable }) => {
  const { signOut, currentWorker } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <nav className="bg-aubergine shadow-md">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="bg-garlic rounded-lg px-2 py-1">
              <img src={mosaicLogo} alt="Mosaic" className="h-8 w-auto" />
            </div>

            {currentWorker && (
              <div className="ml-4 flex items-center space-x-2">
                <span className="text-white/70 text-sm">
                  {currentWorker.name}
                </span>
                {!isEditable && (
                  <span className="bg-saffron text-white px-2 py-1 rounded text-xs font-medium">
                    Read Only
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Only show view toggle for users with edit permissions */}
            {isEditable && (
              <div className="bg-white/10 rounded-lg p-1">
                <button
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'week'
                      ? 'bg-white text-aubergine'
                      : 'text-white hover:bg-white/20'
                  }`}
                  onClick={() => setActiveView('week')}
                >
                  Week
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'month'
                      ? 'bg-white text-aubergine'
                      : 'text-white hover:bg-white/20'
                  }`}
                  onClick={() => setActiveView('month')}
                >
                  Month
                </button>
              </div>
            )}

            <button
              onClick={onNewTask}
              disabled={!isEditable}
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isEditable
                  ? 'text-white bg-saffron hover:bg-saffron/90'
                  : 'text-gray-400 bg-gray-600 cursor-not-allowed'
              }`}
              title={isEditable ? 'Create new task' : 'Read-only mode - cannot create tasks'}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>

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

      {isSettingsOpen && (
        <UserSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};

export default Navbar;
