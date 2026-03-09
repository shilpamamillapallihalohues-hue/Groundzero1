 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import type { ScreenplayElement } from '@/components/screenplay/ScreenplayEditor';
 import type { BeatStructure } from '@/components/screenplay/BeatBoardOverlay';
 
interface ScriptVersion {
  id: string;
  version_number: number;
  title: string;
  content: string | null;
  created_at: string;
  created_by: string | null;
  changes_summary: string | null;
  is_locked: boolean | null;
  locked_at: string | null;
  locked_by: string | null;
  approval_status: string | null;
  approved_at: string | null;
  approved_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  beat_structure: Record<string, any> | null;
  page_count: number | null;
  estimated_runtime_minutes: number | null;
}
 
 export function useScreenplayData(projectId: string | null) {
   const queryClient = useQueryClient();
 
   // Fetch script versions
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['screenplay-versions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('script_versions')
        .select(`
          *,
          submitter:profiles!script_versions_submitted_by_fkey(full_name),
          approver:profiles!script_versions_approved_by_fkey(full_name)
        `)
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []).map((v: any) => ({
        ...v,
        submitter_name: v.submitter?.full_name || null,
        approver_name: v.approver?.full_name || null,
      })) as (ScriptVersion & { submitter_name: string | null; approver_name: string | null })[];
    },
    enabled: !!projectId,
  });
 
   // Fetch scenes for the project
   const { data: rawScenes, isLoading: scenesLoading } = useQuery({
     queryKey: ['screenplay-scenes', projectId],
     queryFn: async () => {
       if (!projectId) return [];
       const { data, error } = await supabase
         .from('scenes')
         .select('*')
         .eq('project_id', projectId);
       if (error) throw error;
       // Natural sort by scene_number
       return (data || []).sort((a: any, b: any) => {
         const aNum = parseFloat(a.scene_number) || 0;
         const bNum = parseFloat(b.scene_number) || 0;
         return aNum - bNum;
       });
     },
     enabled: !!projectId,
   });
   const scenes = rawScenes || [];
 
   // Fetch screenplay elements for a specific version
   const useVersionElements = (versionId: string | null) => {
     return useQuery({
       queryKey: ['screenplay-elements', versionId],
       queryFn: async () => {
         if (!versionId) return [];
         const { data, error } = await supabase
           .from('screenplay_elements')
           .select('*')
           .eq('script_version_id', versionId)
           .order('order_index');
         if (error) throw error;
         return (data || []) as ScreenplayElement[];
       },
       enabled: !!versionId,
     });
   };
 
   // Fetch comments
   const useVersionComments = (versionId: string | null) => {
     return useQuery({
       queryKey: ['screenplay-comments', versionId],
       queryFn: async () => {
         if (!versionId) return [];
         const { data, error } = await supabase
           .from('screenplay_comments')
           .select(`
             *,
             user:profiles!screenplay_comments_user_id_fkey(full_name)
           `)
           .eq('script_version_id', versionId)
           .order('created_at', { ascending: false });
         if (error) throw error;
         return data || [];
       },
       enabled: !!versionId,
     });
   };
 
   // Update script version status
   const updateVersionStatus = useMutation({
     mutationFn: async ({ versionId, updates }: { 
       versionId: string; 
       updates: Partial<ScriptVersion> 
     }) => {
       const { error } = await supabase
         .from('script_versions')
         .update(updates)
         .eq('id', versionId);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['screenplay-versions', projectId] });
       toast.success('Script updated');
     },
     onError: () => toast.error('Failed to update script'),
   });
 
   // Lock/unlock version
   const lockVersion = async (versionId: string, lock: boolean) => {
     const { data: profile } = await supabase
       .from('profiles')
       .select('id')
       .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
       .single();
 
     await updateVersionStatus.mutateAsync({
       versionId,
       updates: {
         is_locked: lock,
         locked_at: lock ? new Date().toISOString() : null,
         locked_by: lock ? profile?.id : null,
         approval_status: lock ? 'locked_for_production' : 'approved',
       },
     });
   };
 
  // Submit for review - stores who submitted
  const submitForReview = async (versionId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    await updateVersionStatus.mutateAsync({
      versionId,
      updates: { 
        approval_status: 'pending_review',
        submitted_by: profile?.id || null,
        submitted_at: new Date().toISOString(),
      },
    });
    toast.success('Submitted for review');
  };
 
   // Approve version
   const approveVersion = async (versionId: string) => {
     const { data: profile } = await supabase
       .from('profiles')
       .select('id')
       .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
       .single();
 
     await updateVersionStatus.mutateAsync({
       versionId,
       updates: {
         approval_status: 'approved',
         approved_at: new Date().toISOString(),
         approved_by: profile?.id,
       },
     });
     toast.success('Script approved');
   };
 
    // Reject version (request changes)
    const rejectVersion = async (versionId: string) => {
      await updateVersionStatus.mutateAsync({
        versionId,
        updates: { approval_status: 'draft' },
      });
      toast.info('Requested changes');
    };

    // Delete version
    const deleteVersion = useMutation({
      mutationFn: async (versionId: string) => {
        // Delete screenplay elements first
        await supabase
          .from('screenplay_elements')
          .delete()
          .eq('script_version_id', versionId);

        // Delete screenplay comments
        await supabase
          .from('screenplay_comments')
          .delete()
          .eq('script_version_id', versionId);

        // Delete the version itself
        const { error } = await supabase
          .from('script_versions')
          .delete()
          .eq('id', versionId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['screenplay-versions', projectId] });
        toast.success('Version deleted');
      },
      onError: () => toast.error('Failed to delete version'),
    });
 
   // Save screenplay elements
   const saveElements = useMutation({
     mutationFn: async ({ versionId, elements }: { 
       versionId: string; 
       elements: ScreenplayElement[] 
     }) => {
       // Delete existing elements
       await supabase
         .from('screenplay_elements')
         .delete()
         .eq('script_version_id', versionId);
 
       // Insert new elements
       if (elements.length > 0) {
         const { error } = await supabase
           .from('screenplay_elements')
           .insert(elements.map((el, idx) => ({
             script_version_id: versionId,
             element_type: el.element_type,
             content: el.content,
             order_index: idx,
             page_number: el.page_number,
             character_name: el.character_name,
             scene_id: el.scene_id,
             metadata: el.metadata || {},
           })));
         if (error) throw error;
       }
     },
     onSuccess: (_, { versionId }) => {
       queryClient.invalidateQueries({ queryKey: ['screenplay-elements', versionId] });
       toast.success('Script saved');
     },
     onError: () => toast.error('Failed to save script'),
   });
 
   // Add comment
    const addComment = useMutation({
      mutationFn: async ({ 
        versionId, 
        elementId, 
        sceneId, 
        text, 
        type 
      }: {
        versionId: string;
        elementId?: string;
        sceneId?: string;
        text: string;
        type: 'note' | 'suggestion' | 'revision_request' | 'approval';
      }) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        // Only include element_id if the element exists in the DB (has been saved)
        // Client-side generated UUIDs won't match DB records and cause FK constraint errors
        let validElementId: string | null = null;
        if (elementId) {
          const { data: existingEl } = await supabase
            .from('screenplay_elements')
            .select('id')
            .eq('id', elementId)
            .maybeSingle();
          if (existingEl) {
            validElementId = elementId;
          }
        }
  
        const { error } = await supabase
          .from('screenplay_comments')
          .insert({
            script_version_id: versionId,
            element_id: validElementId,
            scene_id: sceneId || null,
            project_id: projectId,
            user_id: profile?.id,
            comment_text: text,
            comment_type: type,
          });
        if (error) throw error;
      },
      onSuccess: (_, { versionId }) => {
        queryClient.invalidateQueries({ queryKey: ['screenplay-comments', versionId] });
        toast.success('Comment added');
      },
    });
 
   // Resolve comment
   const resolveComment = useMutation({
     mutationFn: async ({ commentId, versionId }: { commentId: string; versionId: string }) => {
       const { data: profile } = await supabase
         .from('profiles')
         .select('id')
         .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
         .single();
 
       const { error } = await supabase
         .from('screenplay_comments')
         .update({
           is_resolved: true,
           resolved_at: new Date().toISOString(),
           resolved_by: profile?.id,
         })
         .eq('id', commentId);
       if (error) throw error;
     },
     onSuccess: (_, { versionId }) => {
       queryClient.invalidateQueries({ queryKey: ['screenplay-comments', versionId] });
       toast.success('Comment resolved');
     },
   });
 
    // Create a new version with elements (auto-versioning on save)
    const createNewVersion = useMutation({
      mutationFn: async ({
        projectId: pid,
        versionNumber,
        title,
        elements: els,
        changesSummary,
      }: {
        projectId: string;
        versionNumber: number;
        title: string;
        elements: ScreenplayElement[];
        changesSummary: string;
      }) => {
        // Create the new version record
        const { data: newVersion, error: vError } = await supabase
          .from('script_versions')
          .insert({
            project_id: pid,
            version_number: versionNumber,
            title,
            changes_summary: changesSummary,
            approval_status: 'draft',
          })
          .select()
          .single();
        if (vError) throw vError;

        // Insert elements for the new version
        if (els.length > 0) {
          const { error: eError } = await supabase
            .from('screenplay_elements')
            .insert(els.map((el, idx) => ({
              script_version_id: newVersion.id,
              element_type: el.element_type,
              content: el.content,
              order_index: idx,
              page_number: el.page_number,
              character_name: el.character_name,
              scene_id: el.scene_id,
              metadata: el.metadata || {},
            })));
          if (eError) throw eError;
        }

        return newVersion;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['screenplay-versions', projectId] });
        toast.success('New version saved');
      },
      onError: () => toast.error('Failed to create new version'),
    });

    // Lock/unlock scene
    const lockScene = useMutation({
      mutationFn: async ({ sceneId, lock }: { sceneId: string; lock: boolean }) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        const { error } = await supabase
          .from('scenes')
          .update({
            is_locked: lock,
            locked_at: lock ? new Date().toISOString() : null,
            locked_by: lock ? profile?.id : null,
          })
          .eq('id', sceneId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['screenplay-scenes', projectId] });
        toast.success('Scene updated');
      },
    });
 
    // Parse script content into elements
    const parseScriptToElements = (content: string): ScreenplayElement[] => {
      const lines = content.split('\n');
      const elements: ScreenplayElement[] = [];
      let currentElement: Partial<ScreenplayElement> | null = null;

      // Beat/structure tags that should NOT be treated as characters
      const BEAT_TAGS = new Set([
        'ACT I', 'ACT II', 'ACT III', 'ACT IV', 'ACT V',
        'OPENING IMAGE', 'CLOSING IMAGE', 'FINAL IMAGE',
        'THEME STATED', 'SET UP', 'SETUP',
        'CATALYST', 'DEBATE', 'BREAK INTO TWO', 'BREAK INTO THREE',
        'B STORY', 'B STORY THE PROMISE', 'FUN AND GAMES',
        'MIDPOINT', 'BAD GUYS CLOSE IN', 'ALL IS LOST',
        'DARK NIGHT OF THE SOUL', 'BREAK INTO ACT THREE',
        'FINALE', 'FINAL IMAGE', 'PINCH POINT',
        'CLIMAX', 'RESOLUTION', 'DENOUEMENT',
        'MONTAGE', 'FLASHBACK', 'INTERCUT', 'SEQUENCE',
        'BACK HOME, TENSION RISES',
      ]);

      // Check if a line looks like a beat tag / structure marker
      const isBeatTag = (line: string): boolean => {
        const upper = line.replace(/[:\-—]+$/, '').trim().toUpperCase();
        if (BEAT_TAGS.has(upper)) return true;
        // Patterns like "ACT I", "ACT II" etc
        if (/^ACT\s+[IVX\d]+$/i.test(upper)) return true;
        // Common structure patterns
        if (/^(OPENING|CLOSING|FINAL)\s+(IMAGE|SCENE)/i.test(upper)) return true;
        if (/^(THEME|SET\s?UP|CATALYST|DEBATE|MIDPOINT|CLIMAX|RESOLUTION|FINALE)/i.test(upper)) return true;
        if (/^(BREAK INTO|BAD GUYS|ALL IS|DARK NIGHT|FUN AND|B STORY)/i.test(upper)) return true;
        return false;
      };

      // Check if line is a scene heading (SCENE X format or INT./EXT. format)
      const isSceneHeading = (line: string): boolean => {
        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line)) return true;
        if (/^SCENE\s*[\-\d]/i.test(line)) return true;
        return false;
      };

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          if (currentElement) {
            elements.push({
              id: crypto.randomUUID(),
              element_type: currentElement.element_type || 'action',
              content: currentElement.content || '',
              order_index: elements.length,
              character_name: currentElement.character_name,
            });
            currentElement = null;
          }
          return;
        }

        // Scene heading detection (INT./EXT. or SCENE X format)
        if (isSceneHeading(trimmed)) {
          if (currentElement) {
            elements.push({
              id: crypto.randomUUID(),
              element_type: currentElement.element_type || 'action',
              content: currentElement.content || '',
              order_index: elements.length,
              character_name: currentElement.character_name,
            });
          }
          currentElement = { element_type: 'scene_heading', content: trimmed };
          return;
        }

        // Beat tag / structure marker detection - treat as note/action, NOT character
        if (isBeatTag(trimmed)) {
          if (currentElement) {
            elements.push({
              id: crypto.randomUUID(),
              element_type: currentElement.element_type || 'action',
              content: currentElement.content || '',
              order_index: elements.length,
              character_name: currentElement.character_name,
            });
          }
          currentElement = { element_type: 'note', content: trimmed };
          return;
        }

        // Transition detection
        if (/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT:|MATCH CUT:)/i.test(trimmed) ||
            (/^[A-Z\s]+:$/.test(trimmed) && trimmed.length < 20)) {
          if (currentElement) {
            elements.push({
              id: crypto.randomUUID(),
              element_type: currentElement.element_type || 'action',
              content: currentElement.content || '',
              order_index: elements.length,
              character_name: currentElement.character_name,
            });
          }
          currentElement = { element_type: 'transition', content: trimmed };
          return;
        }

        // Character detection (all caps, short, NOT a beat tag, NOT a scene heading keyword)
        if (/^[A-Z][A-Z\s\(\)]+$/.test(trimmed) && trimmed.length < 40 && !trimmed.includes('.') && !isBeatTag(trimmed) && !isSceneHeading(trimmed)) {
          // Additional check: must be a plausible name (1-3 words, not all structure-like)
          const wordCount = trimmed.replace(/\s*\(.*\)\s*$/, '').trim().split(/\s+/).length;
          if (wordCount <= 3) {
            if (currentElement) {
              elements.push({
                id: crypto.randomUUID(),
                element_type: currentElement.element_type || 'action',
                content: currentElement.content || '',
                order_index: elements.length,
                character_name: currentElement.character_name,
              });
            }
            currentElement = { 
              element_type: 'character', 
              content: trimmed,
              character_name: trimmed.replace(/\s*\(.*\)\s*$/, ''),
            };
            return;
          }
        }

        // Parenthetical detection
        if (/^\(.*\)$/.test(trimmed)) {
          if (currentElement) {
            elements.push({
              id: crypto.randomUUID(),
              element_type: currentElement.element_type || 'action',
              content: currentElement.content || '',
              order_index: elements.length,
              character_name: currentElement.character_name,
            });
          }
          currentElement = { element_type: 'parenthetical', content: trimmed };
          return;
        }

        // If previous was character, this is dialogue
        if (currentElement?.element_type === 'character' || 
            currentElement?.element_type === 'parenthetical') {
          elements.push({
            id: crypto.randomUUID(),
            element_type: currentElement.element_type,
            content: currentElement.content || '',
            order_index: elements.length,
            character_name: currentElement.character_name,
          });
          currentElement = { element_type: 'dialogue', content: trimmed };
          return;
        }

        // Default to action or append to current
        if (currentElement) {
          currentElement.content = (currentElement.content || '') + '\n' + trimmed;
        } else {
          currentElement = { element_type: 'action', content: trimmed };
        }
      });

      // Push last element
      if (currentElement && currentElement.content) {
        elements.push({
          id: crypto.randomUUID(),
          element_type: currentElement.element_type || 'action',
          content: currentElement.content,
          order_index: elements.length,
          character_name: currentElement.character_name,
        });
      }

      return elements;
    };
 
     return {
       versions,
       versionsLoading,
       scenes,
       scenesLoading,
       useVersionElements,
       useVersionComments,
       lockVersion,
       submitForReview,
       approveVersion,
       rejectVersion,
       deleteVersion: deleteVersion.mutate,
       saveElements,
       addComment,
       resolveComment,
       lockScene,
       createNewVersion,
       parseScriptToElements,
       isLoading: versionsLoading || scenesLoading,
     };
  }