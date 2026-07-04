import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  isEditingDisabled: boolean;
  toggleEditProfile: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEditingDisabled, setIsEditingDisabled] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setIsEditingDisabled(data.isEditingDisabled);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const toggleEditProfile = async () => {
    const newState = !isEditingDisabled;
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEditingDisabled: newState })
      });
      if (response.ok) {
        setIsEditingDisabled(newState);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  return (
    <SettingsContext.Provider value={{ isEditingDisabled, toggleEditProfile }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
