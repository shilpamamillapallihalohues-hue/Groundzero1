import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// REMOVED: localStorage caching - project selection should be per-session only
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}

// Alias for backwards compatibility
export const useProject = useProjectContext;
