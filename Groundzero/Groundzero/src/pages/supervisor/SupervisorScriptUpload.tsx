import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileText, CheckCircle, AlertCircle, Loader2, File, X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFileParser } from '@/hooks/useFileParser';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

export default function SupervisorScriptUpload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { parseFile, isParsingFile, parseError } = useFileParser();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedContent, setParsedContent] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'parsing' | 'preview' | 'complete'>('upload');

  // Fetch only assigned projects based on role
  const { data: projects } = useAssignedProjects();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      const validExtensions = ['.pdf', '.docx', '.txt'];
      const isValid = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValid) {
        toast.error('Please upload PDF, DOCX, or TXT files only');
        return;
      }
      
      setSelectedFile(file);
      setParsedContent('');
      setStep('upload');
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile) return;
    
    setStep('parsing');
    setUploadProgress(20);
    
    try {
      const content = await parseFile(selectedFile);
      setUploadProgress(70);
      setParsedContent(content);
      setUploadProgress(100);
      setStep('preview');
      toast.success('Script parsed successfully!');
    } catch (error) {
      toast.error('Failed to parse script');
      setStep('upload');
    }
  };

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId || !parsedContent) throw new Error('Missing data');
      
      // Get current version count
      const { data: versions } = await supabase
        .from('script_versions')
        .select('version_number')
        .eq('project_id', selectedProjectId)
        .order('version_number', { ascending: false })
        .limit(1);
      
      const nextVersion = (versions?.[0]?.version_number || 0) + 1;
      
      // Create new version
      const { error } = await supabase
        .from('script_versions')
        .insert({
          project_id: selectedProjectId,
          version_number: nextVersion,
          title: `Version ${nextVersion} - ${selectedFile?.name}`,
          script_text: parsedContent,
        });
      
      if (error) throw error;
      return nextVersion;
    },
    onSuccess: (version) => {
      toast.success(`Script version v${version} created!`);
      queryClient.invalidateQueries({ queryKey: ['supervisor-versions'] });
      setStep('complete');
    },
    onError: () => toast.error('Failed to create script version'),
  });

  const resetUpload = () => {
    setSelectedFile(null);
    setParsedContent('');
    setUploadProgress(0);
    setStep('upload');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-7 w-7 text-primary" />
            Script Upload
          </h1>
          <p className="text-muted-foreground">Upload a screenplay to parse and create scenes</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {['upload', 'parsing', 'preview', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['parsing', 'preview', 'complete'].indexOf(step) > i - 1 ? 'bg-green-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {['parsing', 'preview', 'complete'].indexOf(step) > i - 1 && step !== s ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className={`w-12 h-1 ${['parsing', 'preview', 'complete'].indexOf(step) > i ? 'bg-green-500' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Project Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Upload Step */}
        {step === 'upload' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload Script File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <File className="h-10 w-10 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={resetUpload}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Drop your screenplay file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOCX, TXT
                    </p>
                  </>
                )}
                <Input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className={selectedFile ? 'hidden' : 'mt-4 max-w-xs mx-auto'}
                />
              </div>

              {selectedFile && (
                <Button 
                  onClick={handleParseFile} 
                  disabled={!selectedProjectId}
                  className="w-full"
                >
                  Parse Script
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Parsing Step */}
        {step === 'parsing' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="font-medium mb-4">Parsing script...</p>
              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
            </CardContent>
          </Card>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Script Parsed Successfully
                </span>
                <Badge variant="outline">{parsedContent.length} characters</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {parsedContent.slice(0, 2000)}
                  {parsedContent.length > 2000 && '...'}
                </pre>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetUpload} className="flex-1">
                  Upload Different File
                </Button>
                <Button 
                  onClick={() => createVersionMutation.mutate()} 
                  disabled={createVersionMutation.isPending}
                  className="flex-1"
                >
                  {createVersionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Create Version
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Script Uploaded!</h3>
              <p className="text-muted-foreground mb-6">
                Your script has been parsed and a new version has been created.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetUpload}>
                  Upload Another
                </Button>
                <Button onClick={() => navigate('/supervisor/script-breakdown')}>
                  Go to Script Breakdown
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {parseError && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <span>{parseError}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
