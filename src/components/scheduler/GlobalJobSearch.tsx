import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Job } from '../../types';

interface GlobalJobSearchProps {
  jobs: Job[];
  onJobSelect: (job: Job) => void;
}

const GlobalJobSearch: React.FC<GlobalJobSearchProps> = ({ jobs, onJobSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter jobs based on search term
  const filteredJobs = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return jobs.filter(job =>
      job.address.toLowerCase().includes(term) ||
      job.customer_name?.toLowerCase().includes(term) ||
      job.quote_number?.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results
  }, [jobs, searchTerm]);

  // Reset selected index when filtered jobs change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredJobs]);

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
    if (!isOpen || filteredJobs.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredJobs.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredJobs.length) % filteredJobs.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredJobs[selectedIndex]) {
          handleSelect(filteredJobs[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (job: Job) => {
    onJobSelect(job);
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
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchTerm && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 sm:pl-10 pr-8 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <Search className="absolute left-2 sm:left-3 top-2 sm:top-2.5 h-4 w-4 text-gray-400" />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-2 sm:right-3 top-2 sm:top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && filteredJobs.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {filteredJobs.map((job, index) => (
            <button
              key={job.id}
              onClick={() => handleSelect(job)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="font-medium text-gray-900 text-sm truncate">
                {job.address}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {job.customer_name && (
                  <span className="text-xs text-gray-500 truncate">
                    {job.customer_name}
                  </span>
                )}
                {job.quote_number && (
                  <span className="text-xs text-gray-400">
                    #{job.quote_number}
                  </span>
                )}
                {job.status && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {job.status}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && searchTerm && filteredJobs.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <p className="text-sm text-gray-500 text-center">
            No jobs found matching "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  );
};

export default GlobalJobSearch;
