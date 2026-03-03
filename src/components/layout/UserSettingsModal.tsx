import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeamStore } from '../../store/teamStore';

interface UserSettingsModalProps {
  onClose: () => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ onClose }) => {
  const { currentTeamMember, refreshCurrentTeamMember } = useAuth();
  const { updateTeamMember } = useTeamStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentTeamMember) {
      setName(currentTeamMember.name || '');
      setPhone(currentTeamMember.phone || '');
    }
  }, [currentTeamMember]);

  useEffect(() => {
    if (currentTeamMember) {
      const nameChanged = name !== (currentTeamMember.name || '');
      const phoneChanged = phone !== (currentTeamMember.phone || '');
      setHasChanges(nameChanged || phoneChanged);
    }
  }, [name, phone, currentTeamMember]);

  const handleSave = async () => {
    if (!currentTeamMember || !name.trim()) return;

    setIsLoading(true);
    try {
      await updateTeamMember(currentTeamMember.id, {
        name: name.trim(),
        phone: phone.trim() || null
      });
      await refreshCurrentTeamMember();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (currentTeamMember) {
      setName(currentTeamMember.name || '');
      setPhone(currentTeamMember.phone || '');
    }
    onClose();
  };

  if (!currentTeamMember) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-charcoal" />
            <h2 className="text-xl font-bogart font-medium text-charcoal">
              Settings
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-margaux focus:border-margaux"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="settings-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              value={currentTeamMember.email || ''}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="settings-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="settings-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-margaux focus:border-margaux"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !hasChanges}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-aubergine hover:bg-aubergine/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
