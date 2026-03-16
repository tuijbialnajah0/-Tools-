import React, { createContext, useContext, useState, useEffect } from 'react';

export interface RunningTool {
  id: string;
  name: string;
  path: string;
}

interface ToolContextType {
  runningTools: RunningTool[];
  addTool: (tool: RunningTool) => void;
  removeTool: (toolId: string) => void;
  isToolRunning: (path: string) => boolean;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export const ToolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runningTools, setRunningTools] = useState<RunningTool[]>([]);

  const addTool = (tool: RunningTool) => {
    setRunningTools(prev => {
      if (prev.find(t => t.path === tool.path)) return prev;
      return [...prev, tool];
    });
  };

  const removeTool = (toolId: string) => {
    setRunningTools(prev => prev.filter(t => t.id !== toolId));
  };

  const isToolRunning = (path: string) => {
    return runningTools.some(t => t.path === path);
  };

  return (
    <ToolContext.Provider value={{ runningTools, addTool, removeTool, isToolRunning }}>
      {children}
    </ToolContext.Provider>
  );
};

export const useTools = () => {
  const context = useContext(ToolContext);
  if (!context) throw new Error('useTools must be used within a ToolProvider');
  return context;
};
