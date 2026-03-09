import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  FileText, MessageSquare, History, Maximize2, Minimize2, 
  PanelLeft, PanelRight, Sparkles, Loader2, X, 
  StickyNote, Users as UsersIcon, Wand2, Focus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScreenplayData } from "@/hooks/useScreenplayData";
import { ScreenplayEditor, ScreenplayElement } from "./ScreenplayEditor";
import { SceneNavigationSidebar } from "./SceneNavigationSidebar";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { ApprovalStatusBar } from "./ApprovalStatusBar";
import { ScreenplayComments } from "./ScreenplayComments";
import { ScreenplayHighlightBar, type HighlightCategory } from "./ScreenplayHighlightBar";
import { ScriptVersionCompare } from "./ScriptVersionCompare";
import { SceneStrip } from "./SceneStrip";
import { AIScreenplayTools } from "./AIScreenplayTools";
import { toast } from "sonner";

interface ScreenplayWorkspaceProps {
  projectId: string;
  isDirectorView?: boolean;
  canApprove?: boolean;
  canLock?: boolean;
  hideHighlightBar?: boolean;
}

export function ScreenplayWorkspace({
  projectId,
  isDirectorView = false,
  canApprove = false,
  canLock = false,
  hideHighlightBar = false,
}: ScreenplayWorkspaceProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const hasSetInitialPanel = useRef(false);
  useEffect(() => {
    if (!hasSetInitialPanel.current && !isMobile) {
      setShowLeftPanel(true);
      hasSetInitialPanel.current = true;
    } else if (!hasSetInitialPanel.current && isMobile) {
      hasSetInitialPanel.current = true;
    }
  }, [isMobile]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"comments" | "versions" | "notes" | "activity">("comments");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [localElements, setLocalElements] = useState<ScreenplayElement[] | null>(null);
  const [highlightCharacter, setHighlightCharacter] = useState<string | null>(null);
  const [highlightCategory, setHighlightCategory] = useState<HighlightCategory>('character');
  const [compareVersionIds, setCompareVersionIds] = useState<{ v1: string; v2: string } | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const {
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
    deleteVersion,
    saveElements,
    addComment,
    resolveComment,
    parseScriptToElements,
    createNewVersion,
  } = useScreenplayData(projectId);

  // Auto-select latest version
  const currentVersion = useMemo(() => {
    if (selectedVersionId) {
      return versions?.find((v) => v.id === selectedVersionId);
    }
    return versions?.[0];
  }, [versions, selectedVersionId]);

  const { data: elements, isLoading: elementsLoading } = useVersionElements(currentVersion?.id || null);
  const { data: comments } = useVersionComments(currentVersion?.id || null);

  const { data: compareV1Elements } = useVersionElements(compareVersionIds?.v1 || null);
  const { data: compareV2Elements } = useVersionElements(compareVersionIds?.v2 || null);

  const rawParsedElements = useMemo<ScreenplayElement[]>(() => {
    if (elements && elements.length > 0) return elements;
    if (currentVersion?.content) {
      return parseScriptToElements(currentVersion.content);
    }
    if (versions && versions.length > 0) {
      const versionWithContent = versions.find(v => v.content && v.content.length > 0);
      if (versionWithContent?.content) {
        return parseScriptToElements(versionWithContent.content);
      }
    }
    return [];
  }, [elements, currentVersion?.content, versions, parseScriptToElements]);

  const serverElements = useMemo<ScreenplayElement[]>(() => {
    if (!scenes || scenes.length === 0) return rawParsedElements;
    const hasSceneIds = rawParsedElements.some(el => el.scene_id);
    if (hasSceneIds) return rawParsedElements;

    const sceneMatchers: { test: (content: string) => boolean; sceneId: string; priority: number }[] = [];
    scenes.forEach(scene => {
      const slugline = (scene.slugline || '').trim();
      if (!slugline) return;
      const escaped = slugline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sceneMatchers.push({
        test: (content: string) => new RegExp(`^${escaped}$`, 'i').test(content.trim()),
        sceneId: scene.id,
        priority: 1,
      });
      sceneMatchers.push({
        test: (content: string) => content.toUpperCase().includes(slugline.toUpperCase()),
        sceneId: scene.id,
        priority: 2,
      });
      const sceneNum = scene.scene_number;
      if (sceneNum) {
        const escapedNum = sceneNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sceneMatchers.push({
          test: (content: string) => new RegExp(`SCENE\\s*[\\-:—]?\\s*${escapedNum}\\b`, 'i').test(content),
          sceneId: scene.id,
          priority: 3,
        });
      }
    });
    sceneMatchers.sort((a, b) => a.priority - b.priority);

    let currentSceneIdLocal: string | null = null;
    return rawParsedElements.map(el => {
      if (el.element_type === 'scene_heading') {
        currentSceneIdLocal = null;
        for (const matcher of sceneMatchers) {
          if (matcher.test(el.content)) {
            currentSceneIdLocal = matcher.sceneId;
            break;
          }
        }
        return currentSceneIdLocal ? { ...el, scene_id: currentSceneIdLocal } : el;
      }
      return currentSceneIdLocal ? { ...el, scene_id: currentSceneIdLocal } : el;
    });
  }, [rawParsedElements, scenes]);

  const displayElements = localElements ?? serverElements;

  const prevVersionRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentVersion?.id !== prevVersionRef.current) {
      prevVersionRef.current = currentVersion?.id || null;
      setLocalElements(null);
    }
  }, [currentVersion?.id]);

  // Sidebar scenes
  const sidebarScenes = useMemo(() => {
    return (
      scenes?.map((scene) => {
        const status: "draft" | "review" | "approved" | "locked" = scene.is_locked
          ? "locked"
          : scene.review_status === "approved"
            ? "approved"
            : scene.review_status === "review"
              ? "review"
              : "draft";
        return {
          id: scene.id,
          sceneNumber: scene.scene_number || "",
          slugline: scene.slugline || "Untitled Scene",
          description: scene.description || "",
          location: scene.location,
          timeOfDay: scene.time_of_day,
          characters: (scene.characters as string[]) || [],
          isLocked: scene.is_locked,
          isApproved: scene.review_status === "approved",
          status,
          beatTag: scene.beat_tag,
        };
      }) || []
    );
  }, [scenes]);

  const versionList = useMemo(() => {
    return (
      versions?.map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        title: v.title,
        createdAt: v.created_at,
        changesSummary: v.changes_summary,
        pageCount: v.page_count,
        isLocked: v.is_locked,
        approvalStatus: v.approval_status as any,
        submittedBy: (v as any).submitter_name,
        submittedAt: v.submitted_at,
      })) || []
    );
  }, [versions]);

  const commentList = useMemo(() => {
    return (
      comments?.map((c) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user?.full_name || "Unknown",
        userInitials: (c.user?.full_name || "U").slice(0, 2).toUpperCase(),
        elementId: c.element_id,
        sceneId: c.scene_id,
        commentText: c.comment_text,
        commentType: c.comment_type as any,
        isResolved: c.is_resolved,
        createdAt: c.created_at,
      })) || []
    );
  }, [comments]);

  const approvedScenes = scenes?.filter((s) => s.review_status === "approved").length || 0;

  const nonCharacterPatterns = /^(ACT\s|ALL\s|BREAK\s|BAD\s|DARK\s|FUN\s|FINAL\s|CATALYST|MIDPOINT|CLIMAX|FINALE|PINCH|THEME|OPENING|CLOSING|B\sSTORY|DEBATE|RESOLUTION|CONT|CONTINUED|FADE|CUT|DISSOLVE|INTERCUT|MONTAGE|FLASHBACK|SUPER|TITLE|CARD|SMASH|MATCH|JUMP|IRIS|WIPE|INSERT|CLOSE|WIDE|ANGLE|POV|SCENE|SEQUENCE|END|BEGIN|LATER|CONTINUOUS|MEANWHILE|SIMULTANEOUSLY|ASCETIC|ASCETICS)/i;

  const projectCharacters = useMemo(() => {
    const names = new Set<string>();
    sidebarScenes.forEach(scene => {
      scene.characters?.forEach(c => {
        if (c && c.trim().length > 0 && !nonCharacterPatterns.test(c.trim())) {
          names.add(c.trim());
        }
      });
    });
    const dbNamesUpper = new Set(Array.from(names).map(n => n.toUpperCase()));
    displayElements.forEach(el => {
      if (el.element_type === 'character') {
        const name = (el.character_name || el.content).replace(/\s*\(.*\)\s*$/, '').trim();
        if (!name) return;
        if (nonCharacterPatterns.test(name)) return;
        if (/^(ACT\s|SCENE\s|INT\b|EXT\b)/i.test(name)) return;
        if (dbNamesUpper.has(name.toUpperCase()) || (!name.match(/^[A-Z\s]+$/) || name.split(/\s+/).length <= 2)) {
          names.add(name.length > 1 ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : name.toUpperCase());
        }
      }
    });
    return Array.from(names).sort();
  }, [sidebarScenes, displayElements]);

  const projectAssets = useMemo(() => {
    const names = new Set<string>();
    const excludeWords = new Set(['INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER', 'CUT', 'FADE', 'THE', 'AND', 'BUT', 'THEN', 'BACK', 'TO', 'FROM', 'WITH', 'FOR', 'HIS', 'HER', 'THEIR', 'THIS', 'THAT', 'CONT', 'CONTINUED', 'MORE', 'END', 'CLOSE', 'WIDE', 'ANGLE', 'POV', 'OVER', 'SCENE']);
    const charNamesUpper = new Set(projectCharacters.map(c => c.toUpperCase()));
    displayElements.forEach(el => {
      if (el.element_type === 'action') {
        const matches = el.content.match(/\b[A-Z][A-Z]+(?:\s[A-Z]+)*\b/g);
        matches?.forEach(match => {
          const upper = match.trim();
          if (upper.length > 1 && !charNamesUpper.has(upper) && !excludeWords.has(upper)) {
            names.add(upper);
          }
        });
      }
    });
    return Array.from(names).sort();
  }, [displayElements, projectCharacters]);

  const projectCostumes = useMemo(() => {
    const names = new Set<string>();
    const costumePatterns = /(?:wearing|dressed in|costume|outfit|uniform|cloak|armor|suit|dress|robe|jacket|hat|mask)\s+([^,.;!?]+)/gi;
    displayElements.forEach(el => {
      if (el.element_type === 'action' || el.element_type === 'parenthetical') {
        let match;
        const regex = new RegExp(costumePatterns.source, costumePatterns.flags);
        while ((match = regex.exec(el.content)) !== null) {
          const name = match[1].trim();
          if (name.length > 2 && name.length < 40) names.add(name);
        }
      }
    });
    return Array.from(names).sort();
  }, [displayElements]);

  const highlightedSceneIds = useMemo(() => {
    if (!highlightCharacter) return new Set<string>();
    const ids = new Set<string>();
    if (highlightCategory === 'character') {
      const upper = highlightCharacter.toUpperCase();
      sidebarScenes.forEach(scene => {
        if (scene.characters?.some(c => c.toUpperCase() === upper)) ids.add(scene.id);
      });
      let currentSceneIdLocal: string | null = null;
      displayElements.forEach(el => {
        if (el.element_type === 'scene_heading') currentSceneIdLocal = el.scene_id || null;
        if (el.element_type === 'character') {
          const name = (el.character_name || el.content).replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase();
          if (name === upper && currentSceneIdLocal) ids.add(currentSceneIdLocal);
        }
      });
    } else if (highlightCategory === 'asset') {
      const upper = highlightCharacter.toUpperCase();
      let currentSceneIdLocal: string | null = null;
      displayElements.forEach(el => {
        if (el.element_type === 'scene_heading') currentSceneIdLocal = el.scene_id || null;
        if (el.element_type === 'action' && el.content.toUpperCase().includes(upper) && currentSceneIdLocal) ids.add(currentSceneIdLocal);
      });
    } else if (highlightCategory === 'costume') {
      const lower = highlightCharacter.toLowerCase();
      let currentSceneIdLocal: string | null = null;
      displayElements.forEach(el => {
        if (el.element_type === 'scene_heading') currentSceneIdLocal = el.scene_id || null;
        if ((el.element_type === 'action' || el.element_type === 'parenthetical') && el.content.toLowerCase().includes(lower) && currentSceneIdLocal) ids.add(currentSceneIdLocal);
      });
    }
    return ids;
  }, [highlightCharacter, highlightCategory, sidebarScenes, displayElements]);

  const handleCategoryChange = useCallback((category: HighlightCategory) => {
    setHighlightCategory(category);
    setHighlightCharacter(null);
  }, []);

  const handleElementsChange = useCallback((newElements: ScreenplayElement[]) => {
    if (currentVersion?.is_locked) return;
    setLocalElements(newElements);
  }, [currentVersion?.is_locked]);

  const handleSave = useCallback(() => {
    if (!currentVersion?.id) return;
    const elementsToSave = localElements ?? serverElements;
    saveElements.mutate(
      { versionId: currentVersion.id, elements: elementsToSave },
      {
        onSuccess: () => {
          setLocalElements(null);
          if (isDirectorView && canApprove) {
            approveVersion(currentVersion.id);
          }
        },
      }
    );
  }, [currentVersion?.id, localElements, serverElements, saveElements, isDirectorView, canApprove, approveVersion]);

  const handleSubmitForReview = useCallback(() => {
    if (!currentVersion?.id) return;
    const elementsToSave = localElements ?? serverElements;
    if (localElements) {
      saveElements.mutate(
        { versionId: currentVersion.id, elements: elementsToSave },
        {
          onSuccess: () => {
            setLocalElements(null);
            submitForReview(currentVersion.id);
          },
        }
      );
    } else {
      submitForReview(currentVersion.id);
    }
  }, [currentVersion?.id, localElements, serverElements, saveElements, submitForReview]);

  const handleAddComment = (text: string, type: "note" | "suggestion" | "revision_request" | "approval") => {
    if (!currentVersion?.id) return;
    addComment.mutate({
      versionId: currentVersion.id,
      elementId: selectedElementId || undefined,
      sceneId: selectedSceneId || undefined,
      text,
      type,
    });
  };

  const handleResolveComment = (commentId: string) => {
    if (!currentVersion?.id) return;
    resolveComment.mutate({ commentId, versionId: currentVersion.id });
  };

  const handleAiFormatScript = useCallback(async () => {
    if (!currentVersion?.id) return;
    const elementsToFormat = localElements ?? serverElements;
    if (elementsToFormat.length === 0) {
      toast.error('No script content to format');
      return;
    }
    setIsFormatting(true);
    try {
      const rawContent = elementsToFormat.map(el => el.content).join('\n\n');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('You must be logged in to use AI formatting.');
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(`${supabaseUrl}/functions/v1/format-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ content: rawContent }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${response.status}`);
      }
      const data = await response.json();
      if (!data?.success || !data?.elements) throw new Error(data?.error || 'Formatting failed');
      setLocalElements(data.elements as ScreenplayElement[]);
      toast.success('Script formatted to industry standard!');
    } catch (err: any) {
      console.error('AI format error:', err);
      if (err.name === 'AbortError') {
        toast.error('Formatting timed out. Try formatting a smaller section.');
      } else {
        toast.error(err?.message || 'Failed to format script.');
      }
    } finally {
      setIsFormatting(false);
    }
  }, [currentVersion?.id, localElements, serverElements]);

  const handleCompare = useCallback((v1: string, v2: string) => {
    setCompareVersionIds({ v1, v2 });
  }, []);

  const handleSceneSelect = useCallback((id: string) => {
    setSelectedSceneId(id);
    setScrollTrigger(t => t + 1);
    if (isMobile) setShowLeftPanel(false);
  }, [isMobile]);

  // Get current scene content for AI tools
  const currentSceneContent = useMemo(() => {
    if (!selectedSceneId) return '';
    const sceneElements = displayElements.filter(el => el.scene_id === selectedSceneId);
    return sceneElements.map(el => el.content).join('\n');
  }, [selectedSceneId, displayElements]);

  const currentSceneSlugline = sidebarScenes.find(s => s.id === selectedSceneId)?.slugline;

  // Toggle focus mode
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => {
      if (!prev) {
        setShowLeftPanel(false);
        setShowRightPanel(false);
        setShowAITools(false);
      } else if (!isMobile) {
        setShowLeftPanel(true);
      }
      return !prev;
    });
  }, [isMobile]);

  if (versionsLoading || scenesLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-[500px] w-64" />
          <Skeleton className="h-[500px] flex-1" />
        </div>
      </div>
    );
  }

  if (!currentVersion) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No Script Versions</h3>
          <p className="text-sm text-muted-foreground">
            {isDirectorView
              ? "No scripts have been uploaded for this project yet."
              : "Upload a script to get started with the screenplay editor."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "flex flex-col h-full",
        isFullscreen && "fixed inset-0 z-50 bg-background",
        isFocusMode && !isFullscreen && "ring-1 ring-primary/20"
      )}>
        {/* Approval Status Bar */}
        <ApprovalStatusBar
          status={(currentVersion.approval_status as any) || "draft"}
          isLocked={currentVersion.is_locked || false}
          submittedBy={(currentVersion as any).submitter_name}
          submittedAt={currentVersion.submitted_at || undefined}
          approvedBy={(currentVersion as any).approver_name}
          approvedAt={currentVersion.approved_at || undefined}
          scenesApproved={approvedScenes}
          totalScenes={scenes?.length || 0}
          onSubmitForReview={() => submitForReview(currentVersion.id)}
          onApprove={() => approveVersion(currentVersion.id)}
          onReject={() => rejectVersion(currentVersion.id)}
          onLock={() => lockVersion(currentVersion.id, true)}
          onUnlock={() => lockVersion(currentVersion.id, false)}
          canApprove={canApprove}
          canLock={canLock}
          isReadOnly={false}
        />

        {/* Highlight Bar */}
        {!isDirectorView && !hideHighlightBar && !isFocusMode && (
          <ScreenplayHighlightBar
            characterNames={projectCharacters}
            assetNames={projectAssets}
            costumeNames={projectCostumes}
            activeCategory={highlightCategory}
            onCategoryChange={handleCategoryChange}
            selectedName={highlightCharacter}
            onSelectName={setHighlightCharacter}
          />
        )}

        {/* Scene Navigation Strip */}
        {!isFocusMode && sidebarScenes.length > 0 && (
          <SceneStrip
            scenes={sidebarScenes}
            selectedSceneId={selectedSceneId}
            onSceneSelect={handleSceneSelect}
          />
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Panel - Scene Navigation */}
          {showLeftPanel && !isFocusMode && (
            <div className={cn(
              "flex-shrink-0 flex flex-col",
              isMobile
                ? "absolute inset-0 z-40 bg-background"
                : "w-72 min-w-[250px]"
            )}>
              {isMobile && (
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-sm font-semibold">Scenes</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowLeftPanel(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <SceneNavigationSidebar
                scenes={sidebarScenes}
                selectedSceneId={selectedSceneId}
                onSceneSelect={handleSceneSelect}
                isReadOnly={false}
                highlightedSceneIds={highlightedSceneIds}
              />
            </div>
          )}

          {/* Center - Screenplay Editor */}
          <div className="flex-1 flex flex-col min-w-0 border-x">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/20">
              <div className="flex items-center gap-1">
                {!isFocusMode && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowLeftPanel(!showLeftPanel)}>
                        <PanelLeft className={cn("h-4 w-4", showLeftPanel ? "text-primary" : "text-muted-foreground")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Scenes Panel</TooltipContent>
                  </Tooltip>
                )}
                <div className="h-4 w-px bg-border mx-1" />
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">
                  {currentVersion.title}
                </span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">v{currentVersion.version_number}</span>
                {localElements && (
                  <span className="text-[10px] text-amber-500 font-medium ml-1">• Unsaved</span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {/* AI Format */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-7 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={handleAiFormatScript}
                      disabled={isFormatting}
                    >
                      {isFormatting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      {!isMobile && "AI Format"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Convert to industry screenplay format</TooltipContent>
                </Tooltip>

                {/* AI Tools */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showAITools ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setShowAITools(!showAITools);
                        if (!showAITools) setShowRightPanel(false);
                      }}
                    >
                      <Sparkles className={cn("h-4 w-4", showAITools ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">AI Screenplay Tools</TooltipContent>
                </Tooltip>

                <div className="h-4 w-px bg-border mx-0.5" />

                {/* Comments */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setRightPanelTab("comments");
                        setShowRightPanel(!(showRightPanel && rightPanelTab === "comments"));
                        setShowAITools(false);
                      }}
                    >
                      <MessageSquare className={cn("h-4 w-4", showRightPanel && rightPanelTab === "comments" ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Comments</TooltipContent>
                </Tooltip>

                {/* Versions */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setRightPanelTab("versions");
                        setShowRightPanel(!(showRightPanel && rightPanelTab === "versions"));
                        setShowAITools(false);
                      }}
                    >
                      <History className={cn("h-4 w-4", showRightPanel && rightPanelTab === "versions" ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Version History</TooltipContent>
                </Tooltip>

                <div className="h-4 w-px bg-border mx-0.5" />

                {/* Focus Mode */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isFocusMode ? "secondary" : "ghost"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={toggleFocusMode}
                    >
                      <Focus className={cn("h-4 w-4", isFocusMode ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isFocusMode ? "Exit Focus Mode" : "Focus Mode"}</TooltipContent>
                </Tooltip>

                {/* Fullscreen */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Script Compare or Editor */}
            {compareVersionIds && compareV1Elements && compareV2Elements ? (
              <ScriptVersionCompare
                v1Elements={compareV1Elements}
                v2Elements={compareV2Elements}
                v1Label={`v${versions?.find(v => v.id === compareVersionIds.v1)?.version_number || '?'}`}
                v2Label={`v${versions?.find(v => v.id === compareVersionIds.v2)?.version_number || '?'}`}
                onClose={() => setCompareVersionIds(null)}
              />
            ) : (
              <ScreenplayEditor
                elements={displayElements}
                onChange={handleElementsChange}
                isReadOnly={false}
                isLocked={currentVersion.is_locked || false}
                onSave={handleSave}
                onSubmitForReview={isDirectorView ? undefined : handleSubmitForReview}
                onLock={() => lockVersion(currentVersion.id, true)}
                onUnlock={() => lockVersion(currentVersion.id, false)}
                selectedSceneId={selectedSceneId}
                selectedSceneSlugline={sidebarScenes.find(s => s.id === selectedSceneId)?.slugline}
                scrollTrigger={scrollTrigger}
                onElementClick={(el) => setSelectedElementId(el.id)}
                onAddComment={(elementId) => {
                  setSelectedElementId(elementId);
                  setRightPanelTab("comments");
                  setShowRightPanel(true);
                  setShowAITools(false);
                }}
                highlightCharacter={highlightCharacter}
                highlightCategory={highlightCategory}
                onHighlightCharacter={setHighlightCharacter}
              />
            )}
          </div>

          {/* Right Panel - Comments & Versions */}
          {showRightPanel && !isFocusMode && (
            <div className={cn(
              "flex-shrink-0 flex flex-col",
              isMobile
                ? "absolute inset-0 z-40 bg-background"
                : "w-80"
            )}>
              <Tabs
                value={rightPanelTab}
                onValueChange={(v) => setRightPanelTab(v as any)}
                className="flex-1 flex flex-col"
              >
                <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-muted/20">
                  <TabsTrigger
                    value="comments"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs h-8"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger
                    value="versions"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs h-8"
                  >
                    <History className="h-3.5 w-3.5 mr-1" />
                    Versions
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs h-8"
                  >
                    <StickyNote className="h-3.5 w-3.5 mr-1" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs h-8"
                  >
                    <UsersIcon className="h-3.5 w-3.5 mr-1" />
                    Team
                  </TabsTrigger>
                  {isMobile && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto mr-1" onClick={() => setShowRightPanel(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TabsList>

                <TabsContent value="comments" className="flex-1 m-0 overflow-hidden">
                  <ScreenplayComments
                    comments={commentList}
                    onAddComment={handleAddComment}
                    onResolveComment={handleResolveComment}
                    selectedElementId={selectedElementId}
                    currentSceneId={selectedSceneId}
                    isReadOnly={false}
                    scenes={sidebarScenes.map(s => ({ id: s.id, sceneNumber: s.sceneNumber, slugline: s.slugline }))}
                    onSceneClick={(sceneId) => { setSelectedSceneId(sceneId); setScrollTrigger(t => t + 1); }}
                  />
                </TabsContent>

                <TabsContent value="versions" className="flex-1 m-0 overflow-hidden">
                  <VersionHistoryPanel
                    versions={versionList}
                    currentVersionId={currentVersion?.id}
                    onVersionSelect={setSelectedVersionId}
                    onCompare={handleCompare}
                    onDelete={deleteVersion}
                    isReadOnly={false}
                  />
                </TabsContent>

                <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
                  <div className="p-4 text-center text-muted-foreground">
                    <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Scene notes will appear here.</p>
                    <p className="text-[10px] mt-1">Select a scene and add notes from comments.</p>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="flex-1 m-0 overflow-hidden">
                  <div className="p-4 text-center text-muted-foreground">
                    <UsersIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Team activity feed</p>
                    <p className="text-[10px] mt-1">Recent edits and collaboration events.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* AI Tools Panel */}
          {showAITools && !isFocusMode && (
            <div className={cn(
              "flex-shrink-0",
              isMobile ? "absolute inset-0 z-40 bg-background" : "w-72"
            )}>
              <AIScreenplayTools
                projectId={projectId}
                currentSceneContent={currentSceneContent}
                currentSceneSlugline={currentSceneSlugline}
                onClose={() => setShowAITools(false)}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
