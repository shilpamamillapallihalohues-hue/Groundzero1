import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye, 
  Filter, 
  FolderOpen, 
  Grid3X3, 
  List, 
  Package, 
  Plus, 
  Search, 
  Sparkles, 
  Upload,
  XCircle
} from 'lucide-react';
// MainLayout is provided by App.tsx router - do not import here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useLibraryAssets } from '@/hooks/useLibraryAssets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  LIBRARY_ASSET_TYPE_LABELS, 
  LIBRARY_APPROVAL_STATUS_LABELS,
  LIBRARY_APPROVAL_STATUS_COLORS,
  LibraryAssetType,
  LibraryAsset,
  PIPELINE_ENTRY_POINTS
} from '@/types/library';

const assetTypeIcons: Record<string, any> = {
  model_3d: Box,
  texture: Grid3X3,
  rig: Sparkles,
  animation: Sparkles,
  fx_preset: Sparkles,
  environment_pack: FolderOpen,
  unreal_asset: Package,
  audio: Sparkles,
  misc: FolderOpen,
};

export default function Library() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    libraryAssets,
    approvedAssets,
    pendingApprovals,
    isLoading,
    canUploadToLibrary,
    canApproveLibrary,
    createAsset,
    isCreating,
    updateApproval,
    addToProject,
  } = useLibraryAssets();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('approved');
  
  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    asset_type: '' as LibraryAssetType | '',
    owning_department_id: '',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Add to project dialog state
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(null);
  const [addForm, setAddForm] = useState({
    project_id: '',
    scene_id: '',
    instance_name: '',
  });

  // Fetch departments for filter
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name');
      return data || [];
    },
  });

  // Fetch projects for add-to-project
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, title');
      return data || [];
    },
  });

  // Fetch scenes for selected project
  const { data: scenes } = useQuery({
    queryKey: ['scenes-for-project', addForm.project_id],
    queryFn: async () => {
      if (!addForm.project_id) return [];
      const { data } = await supabase
        .from('scenes')
        .select('id, title')
        .eq('project_id', addForm.project_id);
      return data || [];
    },
    enabled: !!addForm.project_id,
  });

  if (authLoading) return null;
  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  const getFilteredAssets = () => {
    const assets = activeTab === 'approved' ? approvedAssets : 
                   activeTab === 'pending' ? pendingApprovals : 
                   libraryAssets;
    
    return (assets || []).filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
      return matchesSearch && matchesType;
    });
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.asset_type) return;
    
    let thumbnailUrl: string | undefined;
    
    if (selectedFile) {
      setUploadingFile(true);
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `library-assets/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('library-assets')
          .upload(filePath, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('library-assets')
          .getPublicUrl(filePath);
        
        thumbnailUrl = urlData.publicUrl;
      } catch (error) {
        console.error('File upload error:', error);
      }
      setUploadingFile(false);
    }
    
    createAsset({
      name: uploadForm.name,
      description: uploadForm.description,
      asset_type: uploadForm.asset_type as LibraryAssetType,
      owning_department_id: uploadForm.owning_department_id || undefined,
      tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : undefined,
      thumbnail_url: thumbnailUrl,
    });
    
    setUploadOpen(false);
    setUploadForm({ name: '', description: '', asset_type: '', owning_department_id: '', tags: '' });
    setSelectedFile(null);
  };

  const handleAddToProject = () => {
    if (!selectedAsset || !addForm.project_id) return;
    
    addToProject({
      libraryAssetId: selectedAsset.id,
      projectId: addForm.project_id,
      sceneId: addForm.scene_id || undefined,
      instanceName: addForm.instance_name || undefined,
    });
    
    setAddToProjectOpen(false);
    setSelectedAsset(null);
    setAddForm({ project_id: '', scene_id: '', instance_name: '' });
  };

  const openAddToProject = (asset: LibraryAsset) => {
    setSelectedAsset(asset);
    setAddForm({ ...addForm, instance_name: asset.name });
    setAddToProjectOpen(true);
  };

  const filteredAssets = getFilteredAssets();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Asset Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Reusable pre-developed assets for all projects
            </p>
          </div>
          
          {canUploadToLibrary && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="gold" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Asset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Library Asset</DialogTitle>
                  <DialogDescription>
                    Add a reusable asset to the library. It will require approval before use.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Asset Name *</Label>
                    <Input
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Hero Character Base Mesh"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Type *</Label>
                    <Select
                      value={uploadForm.asset_type}
                      onValueChange={(v) => setUploadForm(f => ({ ...f, asset_type: v as LibraryAssetType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LIBRARY_ASSET_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {uploadForm.asset_type && (
                      <p className="text-xs text-muted-foreground">
                        Pipeline entry: {PIPELINE_ENTRY_POINTS[uploadForm.asset_type as LibraryAssetType]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of the asset"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Owning Department</Label>
                    <Select
                      value={uploadForm.owning_department_id || "none"}
                      onValueChange={(v) => setUploadForm(f => ({ ...f, owning_department_id: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments?.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="e.g., character, hero, humanoid"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset File *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept=".fbx,.obj,.glb,.gltf,.blend,.png,.jpg,.jpeg,.psd,.zip,.rar"
                        className="flex-1"
                      />
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpload} disabled={isCreating || uploadingFile || !uploadForm.name || !uploadForm.asset_type}>
                    {isCreating || uploadingFile ? 'Uploading...' : 'Upload Asset'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{libraryAssets?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{approvedAssets?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={pendingApprovals && pendingApprovals.length > 0 ? 'border-amber-500/30' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold">{pendingApprovals?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Download className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Uses</p>
                  <p className="text-2xl font-bold">
                    {libraryAssets?.reduce((acc, a) => acc + (a.usage_count || 0), 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="approved">Approved ({approvedAssets?.length || 0})</TabsTrigger>
              {canApproveLibrary && (
                <TabsTrigger value="pending">
                  Pending Review ({pendingApprovals?.length || 0})
                </TabsTrigger>
              )}
              <TabsTrigger value="all">All Assets</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-[200px]"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(LIBRARY_ASSET_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading assets...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No assets found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'approved' 
                    ? 'No approved library assets yet' 
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAssets.map((asset, idx) => {
                  const Icon = assetTypeIcons[asset.asset_type] || Package;
                  return (
                    <Card 
                      key={asset.id} 
                      className="group overflow-hidden hover:border-primary/40 transition-all animate-slide-up"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="aspect-video bg-muted relative">
                        {asset.thumbnail_url ? (
                          <img 
                            src={asset.thumbnail_url} 
                            alt={asset.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <Badge 
                          className={cn(
                            "absolute top-2 right-2",
                            LIBRARY_APPROVAL_STATUS_COLORS[asset.approval_status]
                          )}
                        >
                          {LIBRARY_APPROVAL_STATUS_LABELS[asset.approval_status]}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{asset.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{LIBRARY_ASSET_TYPE_LABELS[asset.asset_type]}</Badge>
                          {asset.owning_department && (
                            <Badge variant="secondary">{asset.owning_department.name}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {asset.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <span className="text-xs text-muted-foreground">
                            Used {asset.usage_count} times
                          </span>
                          <div className="flex gap-2">
                            {activeTab === 'pending' && canApproveLibrary && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => updateApproval({ assetId: asset.id, status: 'rejected' })}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => updateApproval({ assetId: asset.id, status: 'approved' })}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {asset.approval_status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openAddToProject(asset)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Use
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAssets.map((asset) => {
                  const Icon = assetTypeIcons[asset.asset_type] || Package;
                  return (
                    <div 
                      key={asset.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        {asset.thumbnail_url ? (
                          <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Icon className="h-8 w-8 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{asset.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{LIBRARY_ASSET_TYPE_LABELS[asset.asset_type]}</Badge>
                          <Badge className={LIBRARY_APPROVAL_STATUS_COLORS[asset.approval_status]}>
                            {LIBRARY_APPROVAL_STATUS_LABELS[asset.approval_status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {asset.usage_count} uses
                      </div>
                      <div className="flex gap-2">
                        {asset.approval_status === 'approved' && (
                          <Button size="sm" variant="outline" onClick={() => openAddToProject(asset)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Use in Project
                          </Button>
                        )}
                        {activeTab === 'pending' && canApproveLibrary && (
                          <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => updateApproval({ assetId: asset.id, status: 'approved' })}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add to Project Dialog */}
        <Dialog open={addToProjectOpen} onOpenChange={setAddToProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Project</DialogTitle>
              <DialogDescription>
                Create an instance of "{selectedAsset?.name}" in a project.
                The asset will enter the pipeline at: <strong>{selectedAsset?.pipeline_entry_point || PIPELINE_ENTRY_POINTS[selectedAsset?.asset_type as LibraryAssetType]}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select
                  value={addForm.project_id}
                  onValueChange={(v) => setAddForm(f => ({ ...f, project_id: v, scene_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scene (optional)</Label>
                <Select
                  value={addForm.scene_id}
                  onValueChange={(v) => setAddForm(f => ({ ...f, scene_id: v }))}
                  disabled={!addForm.project_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scene" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific scene</SelectItem>
                    {scenes?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.title || `Scene ${s.id.slice(0,8)}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instance Name</Label>
                <Input
                  value={addForm.instance_name}
                  onChange={(e) => setAddForm(f => ({ ...f, instance_name: e.target.value }))}
                  placeholder="Override name for this instance"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddToProjectOpen(false)}>Cancel</Button>
              <Button onClick={handleAddToProject} disabled={!addForm.project_id}>
                Add to Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Library Asset Rules</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Library assets are read-only. Project instances are editable.</li>
                  <li>• All assets require Director approval before use.</li>
                  <li>• Every usage is logged for audit purposes.</li>
                  <li>• Instances enter the pipeline at the appropriate department.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}

