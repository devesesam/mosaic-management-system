import React, { createContext, useContext, useState } from 'react';

interface DragContextProps {
  isDragging: boolean;
  draggingJobId: string | null;
  setDragging: (isDragging: boolean, jobId?: string) => void;
}

const DragContext = createContext<DragContextProps | undefined>(undefined);

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);

  const setDragging = (isDragging: boolean, jobId?: string) => {
    setIsDragging(isDragging);
    setDraggingJobId(isDragging ? (jobId || null) : null);
  };

  return (
    <DragContext.Provider value={{ isDragging, draggingJobId, setDragging }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDragContext = () => {
  const context = useContext(DragContext);
  if (context === undefined) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
};