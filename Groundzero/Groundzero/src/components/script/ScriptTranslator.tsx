import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Languages, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ScriptTranslatorProps {
  projectId: string;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
];

export function ScriptTranslator({ projectId }: ScriptTranslatorProps) {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: translations, isLoading } = useQuery({
    queryKey: ["script-translations", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("script_translations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const translateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-script", {
        body: {
          text: sourceText,
          sourceLang,
          targetLang,
          projectId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["script-translations", projectId] });
      toast.success("Translation completed");
    },
    onError: (error) => {
      toast.error("Translation failed: " + error.message);
    },
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Script Translation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Source language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">→</span>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Target language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder="Paste script text to translate..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="min-h-[200px] font-mono"
          />

          <Button onClick={() => translateMutation.mutate()} disabled={!sourceText || translateMutation.isPending}>
            {translateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              "Translate Script"
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading translations...</p>
      ) : translations && translations.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Translation History</h3>
          {translations.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {LANGUAGES.find((l) => l.code === t.source_language)?.name} →{" "}
                    {LANGUAGES.find((l) => l.code === t.target_language)?.name}
                  </Badge>
                  <Badge variant={t.status === "completed" ? "default" : "secondary"}>{t.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className="text-sm line-clamp-4">{t.original_content}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Translated</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(t.translated_content || "")}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-sm line-clamp-4">{t.translated_content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
