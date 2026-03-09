import { Suspense, lazy } from "react";
import { lazyRetry } from "@/utils/lazyRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ThemeProvider } from "next-themes";
import { PageLoader } from "@/components/ui/page-loader";
import { MainLayout } from "./components/layout/MainLayout";

// Only Auth is eagerly loaded since it's the entry point
import Auth from "./pages/Auth";

// ── Lazy-loaded pages ────────────────────────────────────────────
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Project pages
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectStatus = lazy(() => import("./pages/ProjectStatus"));

// Pre-production pages
const ScriptBreakdown = lazy(() => import("./pages/ScriptBreakdown"));
const ScriptManagement = lazy(() => import("./pages/ScriptManagement"));
const Scenes = lazy(() => import("./pages/Scenes"));
const Storyboards = lazy(() => import("./pages/Storyboards"));
const ConceptArt = lazy(() => import("./pages/ConceptArt"));
const ConceptWall = lazy(() => import("./pages/ConceptWall"));
const Characters = lazy(() => import("./pages/Characters"));
const References = lazy(() => import("./pages/References"));
const EditLineup = lazy(() => import("./pages/EditLineup"));
const Animatic = lazy(() => import("./pages/Animatic"));
const TechnicalPlanning = lazy(() => import("./pages/TechnicalPlanning"));

// Production pages
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Tasks = lazy(() => import("./pages/Tasks"));
const DepartmentWorkspace = lazy(() => import("./pages/DepartmentWorkspace"));

// Approval pages
const Approvals = lazy(() => import("./pages/Approvals"));
const ReviewHistory = lazy(() => import("./pages/ReviewHistory"));

// Organization pages
const Departments = lazy(() => import("./pages/Departments"));
const Team = lazy(() => import("./pages/Team"));

// Library
const Library = lazy(() => import("./pages/Library"));

// Management pages
const Timeline = lazy(() => import("./pages/Timeline"));
const Vendors = lazy(() => import("./pages/Vendors"));
const SLAPenalties = lazy(() => import("./pages/SLAPenalties"));
const DepartmentReports = lazy(() => import("./pages/DepartmentReports"));

// Internal support pages
const QCWorkspace = lazy(() => import("./pages/QCWorkspace"));
const PipelineMonitoring = lazy(() => import("./pages/PipelineMonitoring"));
const RenderManagement = lazy(() => import("./pages/RenderManagement"));

// AI & Tools pages
const AISettings = lazy(() => import("./pages/AISettings"));
const AIWorkflows = lazy(() => import("./pages/AIWorkflows"));
const ExternalTools = lazy(() => import("./pages/ExternalTools"));
const ComfyUIStudio = lazy(() => import("./pages/ComfyUIStudio"));
const ToolConfiguration = lazy(() => import("./pages/ToolConfiguration"));
const ModelGenerator = lazy(() => import("./pages/ModelGenerator"));

// Admin pages
const Admin = lazy(() => import("./pages/Admin"));
const SystemDashboard = lazy(() => import("./pages/SystemDashboard"));
const SystemSettings = lazy(() => import("./pages/SystemSettings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Infrastructure = lazy(() => import("./pages/admin/Infrastructure"));
const WorkTracking = lazy(() => import("./pages/WorkTracking"));
const VFXOverview = lazy(() => import("./pages/admin/VFXOverview"));
const VFXAnalysis = lazy(() => import("./pages/VFXAnalysis"));

// User pages
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));

// Client Portal
const ClientPortal = lazy(() => import("./pages/ClientPortal"));

// Script Supervisor pages
const SupervisorDashboard = lazy(() => import("./pages/supervisor/SupervisorDashboard"));
const SupervisorProjects = lazy(() => import("./pages/supervisor/SupervisorProjects"));
const SupervisorScriptUpload = lazy(() => import("./pages/supervisor/SupervisorScriptUpload"));
const SupervisorScriptBreakdown = lazy(() => import("./pages/supervisor/SupervisorScriptBreakdown"));
const SupervisorVersions = lazy(() => import("./pages/supervisor/SupervisorVersions"));
const SupervisorScenes = lazy(() => import("./pages/supervisor/SupervisorScenes"));
const SupervisorShots = lazy(() => import("./pages/supervisor/SupervisorShots"));
const SupervisorScriptAnalysis = lazy(() => import("./pages/supervisor/SupervisorScriptAnalysis"));
const SupervisorCreativeContext = lazy(() => import("./pages/supervisor/SupervisorCreativeContext"));
const SupervisorScriptEditor = lazy(() => import("./pages/supervisor/SupervisorScriptEditor"));
const BeatBoard = lazy(() => import("./pages/supervisor/BeatBoard"));
const AllShotsView = lazy(() => import("./pages/supervisor/AllShotsView"));

// Storyboard Supervisor pages
const StoryboardSupervisorDashboard = lazy(() => import("./pages/storyboard-supervisor/StoryboardSupervisorDashboard"));
const SBSceneBreakdown = lazy(() => import("./pages/storyboard-supervisor/SceneBreakdown"));
const SBShotsBreakdown = lazy(() => import("./pages/storyboard-supervisor/ShotsBreakdown"));
const SBPanelView = lazy(() => import("./pages/storyboard-supervisor/PanelView"));
const SBDirectorInputs = lazy(() => import("./pages/storyboard-supervisor/DirectorInputs"));

// Artist pages
const ArtistTasks = lazy(() => import("./pages/artist/ArtistTasks"));
const ArtistAssets = lazy(() => import("./pages/artist/ArtistAssets"));
const ArtistShots = lazy(() => import("./pages/artist/ArtistShots"));
const ArtistFeedback = lazy(() => import("./pages/artist/ArtistFeedback"));

// Director pages
const DirectorApprovals = lazy(() => import("./pages/director/DirectorApprovals"));
const DirectorSceneReviews = lazy(() => import("./pages/director/DirectorSceneReviews"));
const DirectorAssetReviews = lazy(() => import("./pages/director/DirectorAssetReviews"));
const DirectorReviewHistory = lazy(() => import("./pages/director/DirectorReviewHistory"));
const DirectorScript = lazy(() => import("./pages/director/DirectorScript"));
const DirectorStoryboards = lazy(() => import("./pages/director/DirectorStoryboards"));
const DirectorConceptArt = lazy(() => import("./pages/director/DirectorConceptArt"));
const DirectorCharacters = lazy(() => import("./pages/director/DirectorCharacterLibrary"));
const DirectorAISuggestions = lazy(() => import("./pages/director/DirectorAISuggestions"));
const DirectorFeedback = lazy(() => import("./pages/director/DirectorFeedback"));
const DirectorReviewHome = lazy(() => import("./pages/director/DirectorReviewHome"));
const DirectorShots = lazy(() => import("./pages/director/DirectorShots"));
const DirectorCompleteBreakdown = lazy(() => import("./pages/director/DirectorCompleteBreakdown"));
const DirectorSceneShotReview = lazy(() => import("./pages/director/DirectorSceneShotReview"));
const DirectorAIIntelligence = lazy(() => import("./pages/director/DirectorAIIntelligence"));
const DirectorReferences = lazy(() => import("./pages/director/DirectorReferences"));

// Director Pre-Production Review Pages
const DirectorPreprodDashboard = lazy(() => import("./pages/director/preprod/DirectorPreprodDashboard"));
const DirectorScriptReview = lazy(() => import("./pages/director/preprod/DirectorScriptReview"));
const DirectorConceptReview = lazy(() => import("./pages/director/preprod/DirectorConceptReview"));
const DirectorStoryboardReview = lazy(() => import("./pages/director/preprod/DirectorStoryboardReview"));
const DirectorEditLineupReview = lazy(() => import("./pages/director/preprod/DirectorEditLineupReview"));
const DirectorAnimaticReview = lazy(() => import("./pages/director/preprod/DirectorAnimaticReview"));
const DirectorTechReview = lazy(() => import("./pages/director/preprod/DirectorTechReview"));
const DirectorShotWall = lazy(() => import("./pages/director/preprod/DirectorShotWall"));
const Director3DReview = lazy(() => import("./pages/director/preprod/Director3DReview"));
const DirectorPresentationReview = lazy(() => import("./pages/director/preprod/DirectorPresentationReview"));

// Director Creative Context
const DirectorCreativeContext = lazy(() => import("./pages/director/DirectorCreativeContext"));
const DirectorContextReview = lazy(() => import("./pages/director/DirectorContextReview"));

// HOD pages
const HODApprovals = lazy(() => import("./pages/hod/HODApprovals"));
const HODArtists = lazy(() => import("./pages/hod/HODArtists"));
const HODAssets = lazy(() => import("./pages/hod/HODAssets"));
const HODProgress = lazy(() => import("./pages/hod/HODProgress"));
const HODShots = lazy(() => import("./pages/hod/HODShots"));
const HODTasks = lazy(() => import("./pages/hod/HODTasks"));

// PM pages
const PMProjects = lazy(() => import("./pages/pm/PMProjects"));
const PMTasks = lazy(() => import("./pages/pm/PMTasks"));
const PMAssets = lazy(() => import("./pages/pm/PMAssets"));
const PMShots = lazy(() => import("./pages/pm/PMShots"));
const PMTimeline = lazy(() => import("./pages/pm/PMTimeline"));
const PMDepartments = lazy(() => import("./pages/pm/PMDepartments"));
const PMAssignments = lazy(() => import("./pages/pm/PMAssignments"));
const PMEscalations = lazy(() => import("./pages/pm/PMEscalations"));

// Producer pages
const ProducerProjects = lazy(() => import("./pages/producer/ProducerProjects"));
const ProducerReports = lazy(() => import("./pages/producer/ProducerReports"));
const ProducerProjectStatus = lazy(() => import("./pages/producer/ProducerProjectStatus"));
const ProducerAuditLogs = lazy(() => import("./pages/producer/ProducerAuditLogs"));
const ProducerTimeline = lazy(() => import("./pages/producer/ProducerTimeline"));
const ProducerScript = lazy(() => import("./pages/producer/ProducerScript"));
const ProducerVendors = lazy(() => import("./pages/producer/ProducerVendors"));
const ProducerSLA = lazy(() => import("./pages/producer/ProducerSLA"));
const ProducerTeam = lazy(() => import("./pages/producer/ProducerTeam"));
const ProducerDepartments = lazy(() => import("./pages/producer/ProducerDepartments"));
const ProducerPreprodOverview = lazy(() => import("./pages/producer/preprod/ProducerPreprodOverview"));
const ProducerPreprodLocks = lazy(() => import("./pages/producer/preprod/ProducerPreprodLocks"));

// Vendor pages
const VendorTasks = lazy(() => import("./pages/vendor/VendorTasks"));
const VendorDeliverables = lazy(() => import("./pages/vendor/VendorDeliverables"));
const VendorFeedback = lazy(() => import("./pages/vendor/VendorFeedback"));

// Pre-Production Department Pages
const ScriptDashboard = lazy(() => import("./pages/preprod/script/ScriptDashboard"));
const ScriptVersions = lazy(() => import("./pages/preprod/script/ScriptVersions"));
const AIBreakdown = lazy(() => import("./pages/preprod/script/AIBreakdown"));
const SceneEditor = lazy(() => import("./pages/preprod/script/SceneEditor"));
const ScriptLock = lazy(() => import("./pages/preprod/script/ScriptLock"));
const StoryAnalysis = lazy(() => import("./pages/preprod/script/StoryAnalysis"));
const StoryFrameworks = lazy(() => import("./pages/preprod/script/StoryFrameworks"));
const ContinuityAssist = lazy(() => import("./pages/preprod/script/ContinuityAssist"));

// Concept Arts Pages
// ConceptDashboard removed - not required
const AIConceptGeneration = lazyRetry(() => import("./pages/preprod/concept/AIConceptGeneration"));
const ManualConceptUpload = lazy(() => import("./pages/preprod/concept/ManualConceptUpload"));
const AssetConcepts = lazy(() => import("./pages/preprod/concept/AssetConcepts"));
const ConceptReviews = lazy(() => import("./pages/preprod/concept/ConceptReviews"));
const AssetConceptGeneration = lazy(() => import("./pages/preprod/concept/AssetConceptGeneration"));

// Storyboard Pages
const StoryboardDashboard = lazy(() => import("./pages/preprod/storyboard/StoryboardDashboard"));
const AIShotSuggestions = lazy(() => import("./pages/preprod/storyboard/AIShotSuggestions"));
const SceneStoryboards = lazy(() => import("./pages/preprod/storyboard/SceneStoryboards"));
const ShotBreakdown = lazy(() => import("./pages/preprod/storyboard/ShotBreakdown"));
const ShotLock = lazy(() => import("./pages/preprod/storyboard/ShotLock"));

// Edit Lineup Pages
const EditLineupDashboard = lazy(() => import("./pages/preprod/edit-lineup/EditLineupDashboard"));
const ShotTimeline = lazy(() => import("./pages/preprod/edit-lineup/ShotTimeline"));
const EditApproval = lazy(() => import("./pages/preprod/edit-lineup/EditApproval"));

// Animatic/Previz Pages
const AnimaticDashboard = lazy(() => import("./pages/preprod/animatic/AnimaticDashboard"));
const AIPreviz = lazy(() => import("./pages/preprod/animatic/AIPreviz"));
const SceneAnimatics = lazy(() => import("./pages/preprod/animatic/SceneAnimatics"));
const SoundDialogue = lazy(() => import("./pages/preprod/animatic/SoundDialogue"));
const AnimaticReviews = lazy(() => import("./pages/preprod/animatic/AnimaticReviews"));

// Technical Planning Pages
const TechDashboard = lazy(() => import("./pages/preprod/tech/TechDashboard"));
const PipelineDefinition = lazy(() => import("./pages/preprod/tech/PipelineDefinition"));
const FXMocapPlanning = lazy(() => import("./pages/preprod/tech/FXMocapPlanning"));
const RenderEstimates = lazy(() => import("./pages/preprod/tech/RenderEstimates"));
const TechApproval = lazy(() => import("./pages/preprod/tech/TechApproval"));
const VFXBreakdown = lazy(() => import("./pages/preprod/tech/VFXBreakdown"));

// Virtual Production Pages
const VPDashboard = lazy(() => import("./pages/vp/VPDashboard"));
const CameraScouting = lazy(() => import("./pages/vp/CameraScouting"));

// Art Director Pages
const ArtDirectorDashboard = lazy(() => import("./pages/art-director/ArtDirectorDashboard"));
const ConceptAutomate = lazy(() => import("./pages/art-director/ConceptAutomate"));
const ConceptManual = lazy(() => import("./pages/art-director/ConceptManual"));
const ConceptGallery = lazy(() => import("./pages/art-director/ConceptGallery"));
const AssetTypeList = lazy(() => import("./pages/art-director/AssetTypeList"));
const ArtDirectorCreativeContext = lazy(() => import("./pages/art-director/ArtDirectorCreativeContext"));
const FacialTurnaroundGenerator = lazy(() => import("./pages/art-director/FacialTurnaroundGenerator"));
const PresentationUpload = lazy(() => import("./pages/art-director/PresentationUpload"));

// Chat Page
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));

// Character Pipeline Pages
const FacialReconstruction = lazy(() => import("./pages/FacialReconstruction"));

// Location Intelligence
const LocationIntelligence = lazy(() => import("./pages/LocationIntelligence"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader text="Loading page..." />}>
              <Routes>
              {/* Core */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* ========== ARTIST ROUTES ========== */}
              <Route path="/artist/tasks" element={<ArtistTasks />} />
              <Route path="/artist/assets" element={<ArtistAssets />} />
              <Route path="/artist/shots" element={<ArtistShots />} />
              <Route path="/artist/feedback" element={<ArtistFeedback />} />
              
              {/* ========== DIRECTOR ROUTES ========== */}
              <Route path="/director-home" element={<MainLayout><DirectorReviewHome /></MainLayout>} />
              <Route path="/director/approvals" element={<MainLayout><DirectorApprovals /></MainLayout>} />
              <Route path="/director/scene-reviews" element={<MainLayout><DirectorSceneReviews /></MainLayout>} />
              <Route path="/director/asset-reviews" element={<MainLayout><DirectorAssetReviews /></MainLayout>} />
              <Route path="/director/review-history" element={<MainLayout><DirectorReviewHistory /></MainLayout>} />
              <Route path="/director/script" element={<MainLayout><DirectorScript /></MainLayout>} />
              <Route path="/director/references" element={<MainLayout><DirectorReferences /></MainLayout>} />
              <Route path="/director/beat-board" element={<MainLayout><BeatBoard /></MainLayout>} />
              <Route path="/director/storyboards" element={<MainLayout><DirectorStoryboards /></MainLayout>} />
              <Route path="/director/concept-art" element={<MainLayout><DirectorConceptArt /></MainLayout>} />
              <Route path="/director/characters" element={<MainLayout><DirectorCharacters /></MainLayout>} />
              <Route path="/director/ai-suggestions" element={<MainLayout><DirectorAISuggestions /></MainLayout>} />
              <Route path="/director/feedback" element={<MainLayout><DirectorFeedback /></MainLayout>} />
              <Route path="/director/shots" element={<MainLayout><DirectorShots /></MainLayout>} />
              
              {/* Director Pre-Production Review Routes */}
              <Route path="/director/preprod/dashboard" element={<MainLayout><DirectorPreprodDashboard /></MainLayout>} />
              <Route path="/director/preprod/script-review" element={<MainLayout><DirectorScriptReview /></MainLayout>} />
              <Route path="/director/preprod/concept-review" element={<MainLayout><DirectorConceptReview /></MainLayout>} />
              <Route path="/director/preprod/storyboard-review" element={<MainLayout><DirectorStoryboardReview /></MainLayout>} />
              <Route path="/director/preprod/edit-lineup-review" element={<MainLayout><DirectorEditLineupReview /></MainLayout>} />
              <Route path="/director/preprod/animatic-review" element={<MainLayout><DirectorAnimaticReview /></MainLayout>} />
              <Route path="/director/preprod/tech-review" element={<MainLayout><DirectorTechReview /></MainLayout>} />
              <Route path="/director/preprod/shot-wall" element={<MainLayout><DirectorShotWall /></MainLayout>} />
              <Route path="/director/preprod/3d-review" element={<MainLayout><Director3DReview /></MainLayout>} />
              <Route path="/director/preprod/presentation-review" element={<MainLayout><DirectorPresentationReview /></MainLayout>} />
              <Route path="/director/vfx-analysis" element={<MainLayout><VFXAnalysis /></MainLayout>} />
              <Route path="/director/complete-breakdown" element={<MainLayout><DirectorCompleteBreakdown /></MainLayout>} />
              <Route path="/director/scene-shot-review" element={<MainLayout><DirectorSceneShotReview /></MainLayout>} />
              <Route path="/director/ai-intelligence" element={<MainLayout><DirectorAIIntelligence /></MainLayout>} />
              <Route path="/director/creative-context" element={<MainLayout><DirectorCreativeContext /></MainLayout>} />
              <Route path="/director/context-review" element={<DirectorContextReview />} />
              
              {/* ========== CHAT ROUTES ========== */}
              <Route path="/chat" element={<MainLayout><ChatPage /></MainLayout>} />

              {/* ========== HOD ROUTES ========== */}
              <Route path="/hod/approvals" element={<HODApprovals />} />
              <Route path="/hod/artists" element={<HODArtists />} />
              <Route path="/hod/assets" element={<HODAssets />} />
              <Route path="/hod/progress" element={<HODProgress />} />
              <Route path="/hod/shots" element={<HODShots />} />
              <Route path="/hod/tasks" element={<HODTasks />} />
              
              {/* ========== PM ROUTES ========== */}
              <Route path="/pm/projects" element={<PMProjects />} />
              <Route path="/pm/tasks" element={<PMTasks />} />
              <Route path="/pm/assets" element={<PMAssets />} />
              <Route path="/pm/shots" element={<PMShots />} />
              <Route path="/pm/timeline" element={<PMTimeline />} />
              <Route path="/pm/departments" element={<PMDepartments />} />
              <Route path="/pm/assignments" element={<PMAssignments />} />
              <Route path="/pm/escalations" element={<PMEscalations />} />
              
              {/* ========== PRODUCER ROUTES ========== */}
              <Route path="/producer/projects" element={<ProducerProjects />} />
              <Route path="/producer/reports" element={<ProducerReports />} />
              <Route path="/producer/project-status" element={<ProducerProjectStatus />} />
              <Route path="/producer/audit-logs" element={<ProducerAuditLogs />} />
              <Route path="/producer/timeline" element={<ProducerTimeline />} />
              <Route path="/producer/script" element={<ProducerScript />} />
              <Route path="/producer/vendors" element={<ProducerVendors />} />
              <Route path="/producer/sla" element={<ProducerSLA />} />
              <Route path="/producer/team" element={<ProducerTeam />} />
              <Route path="/producer/departments" element={<ProducerDepartments />} />
              
              {/* Producer Pre-Production Routes */}
              <Route path="/producer/preprod/overview" element={<ProducerPreprodOverview />} />
              <Route path="/producer/preprod/locks" element={<ProducerPreprodLocks />} />
              
              {/* ========== VENDOR ROUTES ========== */}
              <Route path="/vendor/tasks" element={<VendorTasks />} />
              <Route path="/vendor/deliverables" element={<VendorDeliverables />} />
              <Route path="/vendor/feedback" element={<VendorFeedback />} />
              
              {/* ========== SCRIPT SUPERVISOR ROUTES ========== */}
              <Route path="/supervisor/dashboard" element={<MainLayout><SupervisorDashboard /></MainLayout>} />
              <Route path="/supervisor/projects" element={<MainLayout><SupervisorProjects /></MainLayout>} />
              <Route path="/supervisor/script-upload" element={<MainLayout><SupervisorScriptUpload /></MainLayout>} />
              <Route path="/supervisor/script-breakdown" element={<MainLayout><SupervisorScriptBreakdown /></MainLayout>} />
              <Route path="/supervisor/versions" element={<MainLayout><SupervisorVersions /></MainLayout>} />
              <Route path="/supervisor/scenes" element={<MainLayout><SupervisorScenes /></MainLayout>} />
              <Route path="/supervisor/shots" element={<MainLayout><SupervisorShots /></MainLayout>} />
              <Route path="/supervisor/script-analysis" element={<MainLayout><SupervisorScriptAnalysis /></MainLayout>} />
              <Route path="/supervisor/creative-context" element={<SupervisorCreativeContext />} />
              <Route path="/supervisor/all-shots" element={<MainLayout><AllShotsView /></MainLayout>} />
              <Route path="/supervisor/script-editor" element={<MainLayout><SupervisorScriptEditor /></MainLayout>} />
              <Route path="/supervisor/beat-board" element={<MainLayout><BeatBoard /></MainLayout>} />
              
              {/* ========== STORYBOARD SUPERVISOR ROUTES ========== */}
              <Route path="/storyboard-supervisor/dashboard" element={<StoryboardSupervisorDashboard />} />
              <Route path="/storyboard-supervisor/scene-breakdown" element={<MainLayout><SBSceneBreakdown /></MainLayout>} />
              <Route path="/storyboard-supervisor/shots-breakdown" element={<MainLayout><SBShotsBreakdown /></MainLayout>} />
              <Route path="/storyboard-supervisor/panel-view" element={<SBPanelView />} />
              <Route path="/storyboard-supervisor/director-inputs" element={<SBDirectorInputs />} />
              
              {/* ========== VIRTUAL PRODUCTION ROUTES ========== */}
              <Route path="/vp/dashboard" element={<MainLayout><VPDashboard /></MainLayout>} />
              <Route path="/vp/camera-scouting" element={<MainLayout><CameraScouting /></MainLayout>} />
              <Route path="/vp/location-intelligence" element={<MainLayout><LocationIntelligence /></MainLayout>} />
              
              {/* ========== ART DIRECTOR ROUTES ========== */}
              <Route path="/art-director/dashboard" element={<MainLayout><ArtDirectorDashboard /></MainLayout>} />
              <Route path="/art-director/concepts/automate" element={<MainLayout><ConceptAutomate /></MainLayout>} />
              <Route path="/art-director/concepts/manual" element={<MainLayout><ConceptManual /></MainLayout>} />
              <Route path="/art-director/concepts/gallery" element={<MainLayout><ConceptGallery /></MainLayout>} />
              <Route path="/art-director/assets/:type" element={<MainLayout><AssetTypeList /></MainLayout>} />
              <Route path="/art-director/creative-context" element={<ArtDirectorCreativeContext />} />
              <Route path="/art-director/facial-turnaround" element={<MainLayout><FacialTurnaroundGenerator /></MainLayout>} />
              <Route path="/art-director/presentations" element={<MainLayout><PresentationUpload /></MainLayout>} />
              
              {/* ========== CHARACTER PIPELINE ROUTES ========== */}
              <Route path="/characters/facial-reconstruction" element={<MainLayout><FacialReconstruction /></MainLayout>} />
              
              {/* ========== ADMIN ROUTES (no self-wrap) ========== */}
              <Route path="/admin/infrastructure" element={<MainLayout><Infrastructure /></MainLayout>} />
              <Route path="/admin/vfx-overview" element={<MainLayout><VFXOverview /></MainLayout>} />
              <Route path="/admin/vfx-analysis" element={<MainLayout><VFXAnalysis /></MainLayout>} />
              
              {/* ========== PRE-PRODUCTION DEPARTMENT ROUTES (self-wrap) ========== */}
              <Route path="/preprod/script/dashboard" element={<ScriptDashboard />} />
              <Route path="/preprod/script/versions" element={<ScriptVersions />} />
              <Route path="/preprod/script/ai-breakdown" element={<AIBreakdown />} />
              <Route path="/preprod/script/scenes" element={<SceneEditor />} />
              <Route path="/preprod/script/story-analysis" element={<StoryAnalysis />} />
              <Route path="/preprod/script/story-frameworks" element={<StoryFrameworks />} />
              <Route path="/preprod/script/continuity-assist" element={<ContinuityAssist />} />
              <Route path="/preprod/script/lock" element={<ScriptLock />} />
              
              {/* ConceptDashboard route removed */}
              <Route path="/preprod/concept/ai" element={<AIConceptGeneration />} />
              <Route path="/preprod/concept/manual" element={<ManualConceptUpload />} />
              <Route path="/preprod/concept/assets" element={<AssetConcepts />} />
              <Route path="/preprod/concept/reviews" element={<ConceptReviews />} />
              <Route path="/preprod/concept/asset-generation" element={<AssetConceptGeneration />} />
              
              <Route path="/preprod/storyboard/dashboard" element={<StoryboardDashboard />} />
              <Route path="/preprod/storyboard/ai-shots" element={<AIShotSuggestions />} />
              <Route path="/preprod/storyboard/scenes" element={<SceneStoryboards />} />
              <Route path="/preprod/storyboard/shots" element={<ShotBreakdown />} />
              <Route path="/preprod/storyboard/lock" element={<ShotLock />} />
              
              <Route path="/preprod/edit-lineup/dashboard" element={<EditLineupDashboard />} />
              <Route path="/preprod/edit-lineup/timeline" element={<ShotTimeline />} />
              <Route path="/preprod/edit-lineup/approval" element={<EditApproval />} />
              
              <Route path="/preprod/animatic/dashboard" element={<AnimaticDashboard />} />
              <Route path="/preprod/animatic/ai" element={<AIPreviz />} />
              <Route path="/preprod/animatic/scenes" element={<SceneAnimatics />} />
              <Route path="/preprod/animatic/sound" element={<SoundDialogue />} />
              <Route path="/preprod/animatic/reviews" element={<AnimaticReviews />} />
              
              <Route path="/preprod/tech/dashboard" element={<TechDashboard />} />
              <Route path="/preprod/tech/pipeline" element={<PipelineDefinition />} />
              <Route path="/preprod/tech/fx-mocap" element={<FXMocapPlanning />} />
              <Route path="/preprod/tech/render-estimates" element={<RenderEstimates />} />
              <Route path="/preprod/tech/vfx-breakdown" element={<VFXBreakdown />} />
              <Route path="/preprod/tech/approval" element={<TechApproval />} />
              
              {/* ========== SUPER USER / ADMIN SHARED ROUTES (self-wrap) ========== */}
              <Route path="/projects" element={<Projects />} />
              <Route path="/project/:projectId" element={<ProjectDetail />} />
              <Route path="/project-status" element={<ProjectStatus />} />
              <Route path="/breakdown" element={<ScriptBreakdown />} />
              <Route path="/script-management" element={<ScriptManagement />} />
              <Route path="/scenes" element={<Scenes />} />
              <Route path="/storyboards" element={<Storyboards />} />
              <Route path="/concept-art" element={<ConceptArt />} />
              <Route path="/concept-wall" element={<ConceptWall />} />
              <Route path="/characters" element={<Characters />} />
              <Route path="/references" element={<References />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/department/:departmentId" element={<DepartmentWorkspace />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/review-history" element={<ReviewHistory />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/team" element={<Team />} />
              <Route path="/library" element={<Library />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/sla-penalties" element={<SLAPenalties />} />
              <Route path="/department-reports" element={<DepartmentReports />} />
              <Route path="/qc-workspace" element={<QCWorkspace />} />
              <Route path="/pipeline-monitoring" element={<PipelineMonitoring />} />
              <Route path="/render-management" element={<RenderManagement />} />
              <Route path="/ai-settings" element={<AISettings />} />
              <Route path="/ai-workflows" element={<AIWorkflows />} />
              <Route path="/external-tools" element={<ExternalTools />} />
              <Route path="/comfyui-studio" element={<ComfyUIStudio />} />
              <Route path="/tool-configuration" element={<ToolConfiguration />} />
              <Route path="/model-generator" element={<ModelGenerator />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/system-dashboard" element={<SystemDashboard />} />
              <Route path="/system-settings" element={<SystemSettings />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/work-tracking" element={<WorkTracking />} />
              <Route path="/edit-lineup" element={<EditLineup />} />
              <Route path="/animatic" element={<Animatic />} />
              <Route path="/technical-planning" element={<TechnicalPlanning />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/client" element={<ClientPortal />} />
              <Route path="/client/dashboard" element={<ClientPortal />} />
              <Route path="/client/scenes" element={<ClientPortal />} />
              <Route path="/client/shots" element={<ClientPortal />} />
              <Route path="/client/assets" element={<ClientPortal />} />
              <Route path="/client/approvals" element={<ClientPortal />} />
              <Route path="/client/history" element={<ClientPortal />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ProjectProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
