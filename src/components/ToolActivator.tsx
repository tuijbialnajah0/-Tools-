import { useEffect } from 'react';
import { useTools } from '../context/ToolContext';

interface ToolActivatorProps {
  name: string;
  path: string;
}

export function ToolActivator({ name, path }: ToolActivatorProps) {
  const { addTool } = useTools();

  useEffect(() => {
    addTool({
      id: path,
      name,
      path
    });
  }, [addTool, name, path]);

  return null;
}
