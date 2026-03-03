import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Task } from '../../types';

interface GlobalTaskSearchProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
}

const GlobalTaskSearch: React.FC<GlobalTaskSearchProps> = ({ tasks, onTaskSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter tasks based on search term
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return tasks.filter(task =>
      task.name.toLowerCase().includes(term) ||
      task.notes?.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results
  }, [tasks, searchTerm]);

  // Reset selected index when filtered tasks change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTasks]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredTasks.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredTasks.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredTasks.length) % filteredTasks.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredTasks[selectedIndex]) {
          handleSelect(filteredTasks[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (task: Task) => {
    onTaskSelect(task);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchTerm && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 sm:pl-10 pr-8 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-margaux focus:border-margaux"
        />
        <Search className="absolute left-2 sm:left-3 top-2 sm:top-2.5 h-4 w-4 text-gray-400" />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-2 sm:right-3 top-2 sm:top-2.5 text-gray-400 hover:text-charcoal"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && filteredTasks.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {filteredTasks.map((task, index) => (
            <button
              key={task.id}
              onClick={() => handleSelect(task)}
              className={`w-full px-4 py-3 text-left hover:bg-vanilla border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-margaux/10' : ''
              }`}
            >
              <div className="font-medium text-charcoal text-sm truncate">
                {task.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {task.status && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-vanilla text-charcoal">
                    {task.status}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && searchTerm && filteredTasks.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <p className="text-sm text-gray-500 text-center">
            No tasks found matching "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  );
};

export default GlobalTaskSearch;

// Backwards compatibility
export { GlobalTaskSearch as GlobalJobSearch };
