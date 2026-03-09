 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Skeleton } from '@/components/ui/skeleton';
 import { FileEdit } from 'lucide-react';
 import { useProjectContext } from '@/contexts/ProjectContext';
 import { ScreenplayWorkspace } from '@/components/screenplay/ScreenplayWorkspace';
 import { useAssignedProjects } from '@/hooks/useAssignedProjects';
 
 export default function SupervisorScriptEditor() {
   const { selectedProjectId, setSelectedProjectId } = useProjectContext();
 
   // Fetch only assigned projects based on role
   const { data: projects, isLoading: projectsLoading } = useAssignedProjects();
 
   const activeProjectId = selectedProjectId || projects?.[0]?.id || null;
 
   if (projectsLoading) {
     return (
       <div className="space-y-4">
         <Skeleton className="h-10 w-48" />
         <Skeleton className="h-[600px]" />
       </div>
     );
   }
 
   return (
     <div className="h-[calc(100vh-120px)] flex flex-col">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
         <div>
           <h1 className="text-2xl font-bold flex items-center gap-2">
             <FileEdit className="h-7 w-7 text-primary" />
             Screenplay Editor
           </h1>
           <p className="text-muted-foreground">Professional screenplay editing with industry formatting</p>
         </div>
 
         <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
           <SelectTrigger className="w-[240px]">
             <SelectValue placeholder="Select Project" />
           </SelectTrigger>
           <SelectContent>
             {projects?.map(project => (
               <SelectItem key={project.id} value={project.id}>
                 {project.title}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {/* Screenplay Workspace */}
       {activeProjectId ? (
         <div className="flex-1 min-h-0">
            <ScreenplayWorkspace
              projectId={activeProjectId}
              isDirectorView={false}
              canApprove={false}
              canLock={false}
              hideHighlightBar={true}
            />
         </div>
       ) : (
         <div className="flex items-center justify-center h-[400px] text-muted-foreground">
           Select a project to open the screenplay editor
         </div>
       )}
     </div>
   );
 }