import React from 'react';
import { X } from 'lucide-react';

interface HelloModalProps {
  onClose: () => void;
}

const HelloModal: React.FC<HelloModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            Hello World!
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-lg text-gray-700 mb-4">
            🎉 You have successfully logged in!
          </p>
          <p className="text-gray-600">
            This modal appears automatically after login to confirm everything is working correctly.
          </p>
        </div>
        
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelloModal;