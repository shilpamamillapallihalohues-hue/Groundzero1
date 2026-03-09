import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Wand2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface VoiceToStoryboardProps {
  projectId: string;
  sceneId?: string;
}

export function VoiceToStoryboard({ projectId, sceneId }: VoiceToStoryboardProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const queryClient = useQueryClient();

  const { data: recordings, isLoading } = useQuery({
    queryKey: ["voice-recordings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_recordings")
        .select("*, created_by_profile:profiles!voice_recordings_created_by_fkey(full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        // For demo, we'll use manual transcription
        // In production, this would be sent to a speech-to-text service
        toast.info("Recording saved. Please enter the transcription manually.");
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const generateFromTextMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Save the voice recording entry
      const { data: recording, error: recordingError } = await supabase
        .from("voice_recordings")
        .insert({
          project_id: projectId,
          scene_id: sceneId || null,
          audio_url: "manual_transcription",
          transcription,
          status: "processing",
          created_by: profile?.id,
        })
        .select()
        .single();

      if (recordingError) throw recordingError;

      // Generate storyboard from transcription
      if (sceneId) {
        const { error: storyboardError } = await supabase.functions.invoke("generate-storyboard", {
          body: {
            sceneId,
            prompt: transcription,
            artStyle: "photoreal",
          },
        });

        if (storyboardError) {
          // Update recording status to failed
          await supabase
            .from("voice_recordings")
            .update({ status: "failed" })
            .eq("id", recording.id);
          throw storyboardError;
        }

        // Update recording status to completed
        await supabase
          .from("voice_recordings")
          .update({ status: "completed" })
          .eq("id", recording.id);
      }

      return recording;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["storyboards"] });
      setIsProcessing(false);
      setTranscription("");
      toast.success("Storyboard generated from voice description");
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error("Failed to generate: " + error.message);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice-to-Storyboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sceneId && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              Select a scene first to generate storyboards from voice descriptions.
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              className="w-32"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Record
                </>
              )}
            </Button>

            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm text-muted-foreground">Recording...</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Scene Description</label>
            <Textarea
              placeholder="Describe the scene... (e.g., 'A wide establishing shot of the city at sunset. The camera slowly pans across the skyline as the lights begin to flicker on.')"
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <Button
            onClick={() => generateFromTextMutation.mutate()}
            disabled={!transcription || !sceneId || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Storyboard...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Storyboard from Description
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recording History */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading recordings...</p>
      ) : recordings && recordings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Recording History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-start gap-4 p-3 rounded bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          recording.status === "completed"
                            ? "default"
                            : recording.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {recording.status}
                      </Badge>
                      {recording.generated_storyboard_ids &&
                        (recording.generated_storyboard_ids as string[]).length > 0 && (
                          <Badge variant="outline">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {(recording.generated_storyboard_ids as string[]).length} shots
                          </Badge>
                        )}
                    </div>
                    <p className="text-sm line-clamp-2">{recording.transcription}</p>
                    {recording.created_by_profile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {(recording.created_by_profile as any).full_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
