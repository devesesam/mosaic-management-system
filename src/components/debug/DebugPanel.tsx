import React, { useState } from 'react';
import DebugDataTester from './DebugDataTester';
import SupabaseConnectionTest from './SupabaseConnectionTest';

const DebugPanel = () => {
  const [activeTab, setActiveTab] = useState<'data' | 'connection'>('data');

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md z-50 text-sm">
      <h3 className="font-bold text-lg text-gray-800 mb-3">Debug Panel</h3>
      
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('data')}
          className={`px-3 py-1 rounded ${
            activeTab === 'data' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Data Tester
        </button>
        
        <button
          onClick={() => setActiveTab('connection')}
          className={`px-3 py-1 rounded ${
            activeTab === 'connection' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Connection Test
        </button>
      </div>
      
      {activeTab === 'data' && <DebugDataTester />}
      {activeTab === 'connection' && <SupabaseConnectionTest />}
      
      <div className="mt-4 text-xs text-gray-500 italic">
        Hint: Press Ctrl+Shift+D to toggle this debug panel
      </div>
    </div>
  );
};

export default DebugPanel;