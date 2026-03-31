import { useEffect } from 'react';
import { useTools } from '../context/ToolContext';
import { usageService } from '../services/usageService';

interface ToolActivatorProps {
  name: string;
  path: string;
}

export function ToolActivator({ name, path }: ToolActivatorProps) {
  const { addTool } = useTools();

  useEffect(() => {
    // Add to local tool manager
    addTool({
      id: path,
      name,
      path
    });

    // Increment usage in Supabase (non-blocking)
    usageService.incrementUsage(path);
  }, [addTool, name, path]);

  return null;
}
