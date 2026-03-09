import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Image, Loader2, Check, Sparkles } from 'lucide-react';
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CONCEPT_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'costume', label: 'Costume' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'creature', label: 'Creature' },
];

export default function ManualConceptUpload() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conceptType, setConceptType] = useState('character');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['upload-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, title').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: recentUploads } = useQuery({
    queryKey: ['recent-manual-uploads', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase.from('concept_arts')
        .select('id, title, image_url, concept_type, created_at')
        .eq('project_id', selectedProjectId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  const handleFileChange = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !title || !selectedProjectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `concept-art/${selectedProjectId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('concept-uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('concept-uploads').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('concept_arts').insert({
        project_id: selectedProjectId,
        title,
        description,
        concept_type: conceptType as any,
        art_style: 'mixed' as any,
        image_url: publicUrl,
        status: 'draft',
        prompt: 'Manual upload',
      });

      if (insertError) throw insertError;

      toast.success('Concept uploaded successfully');
      setTitle('');
      setDescription('');
      setFile(null);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['recent-manual-uploads'] });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Upload className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Manual Concept Upload</h1>
              <p className="text-xs text-muted-foreground">Upload reference art and concept designs</p>
            </div>
          </div>
          <Select value={selectedProjectId || ''} onValueChange={(v) => setSelectedProjectId(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          {/* Upload Form */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* Drop Zone */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                  preview && "p-2"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="py-6">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Drop image here or click to browse</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, WEBP up to 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shiva - Front View" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Asset Type</Label>
                  <Select value={conceptType} onValueChange={setConceptType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONCEPT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about this concept..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <Button className="w-full" onClick={handleUpload} disabled={uploading || !file || !title}>
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload Concept</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Uploads */}
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Uploads</p>
              {recentUploads && recentUploads.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {recentUploads.map(upload => (
                    <div key={upload.id} className="rounded-lg border overflow-hidden">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {upload.image_url ? (
                          <img src={upload.image_url} alt={upload.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-5 w-5 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] font-medium truncate">{upload.title}</p>
                        <Badge variant="outline" className="text-[9px]">{upload.concept_type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Image className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No uploads yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
