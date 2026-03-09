import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Check, X, MessageSquare, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DepartmentReviewWorkflowProps {
  projectId: string;
}

const DEPARTMENTS = ["Art", "Camera", "Costume", "VFX", "Sound", "Lighting", "Animation"];
const ASSET_TYPES = ["storyboard", "concept_art", "proxy_model", "motion_clip"];

export function DepartmentReviewWorkflow({ projectId }: DepartmentReviewWorkflowProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [feedback, setFeedback] = useState("");
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["department-reviews", projectId, selectedDepartment],
    queryFn: async () => {
      let query = supabase
        .from("department_reviews")
        .select("*, reviewer:profiles!department_reviews_reviewer_id_fkey(full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("department-reviews-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "department_reviews",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["department-reviews", projectId, selectedDepartment] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, selectedDepartment, queryClient]);

  const updateReviewMutation = useMutation({
    mutationFn: async ({
      reviewId,
      status,
      feedbackText,
    }: {
      reviewId: string;
      status: string;
      feedbackText?: string;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const updates: any = {
        status,
        reviewer_id: profile?.id,
        reviewed_at: new Date().toISOString(),
      };

      if (feedbackText) {
        updates.feedback = feedbackText;
      }

      const { error } = await supabase.from("department_reviews").update(updates).eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-reviews", projectId, selectedDepartment] });
      setActiveReview(null);
      setFeedback("");
      toast.success("Review updated");
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <Check className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-500" />;
      case "changes_requested":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "changes_requested":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const pendingCount = reviews?.filter((r) => r.status === "pending").length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Department Reviews
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending ({reviews?.filter((r) => r.status === "pending").length || 0})
            </TabsTrigger>
            <TabsTrigger value="in_review">
              In Review ({reviews?.filter((r) => r.status === "in_review").length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({reviews?.filter((r) => ["approved", "rejected", "changes_requested"].includes(r.status || "")).length || 0})
            </TabsTrigger>
          </TabsList>

          {["pending", "in_review", "completed"].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue}>
              {isLoading ? (
                <p className="text-muted-foreground">Loading reviews...</p>
              ) : (
                <div className="space-y-4">
                  {reviews
                    ?.filter((r) => {
                      if (tabValue === "completed") {
                        return ["approved", "rejected", "changes_requested"].includes(r.status || "");
                      }
                      return r.status === tabValue;
                    })
                    .map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{review.department}</Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {review.asset_type.replace("_", " ")}
                                </Badge>
                                <Badge className={getStatusColor(review.status || "pending")}>
                                  {getStatusIcon(review.status || "pending")}
                                  <span className="ml-1 capitalize">{review.status?.replace("_", " ")}</span>
                                </Badge>
                              </div>

                              <p className="text-xs text-muted-foreground mb-2">
                                Asset ID: {review.asset_id?.slice(0, 8)}...
                              </p>

                              {review.feedback && (
                                <div className="bg-muted/50 p-2 rounded text-sm mb-2">
                                  <MessageSquare className="h-3 w-3 inline mr-1" />
                                  {review.feedback}
                                </div>
                              )}

                              {review.reviewer && (
                                <p className="text-xs text-muted-foreground">
                                  Reviewed by {(review.reviewer as any).full_name} •{" "}
                                  {review.reviewed_at && format(new Date(review.reviewed_at), "MMM d, h:mm a")}
                                </p>
                              )}
                            </div>

                            {review.status === "pending" && (
                              <div className="flex flex-col gap-2">
                                {activeReview === review.id ? (
                                  <div className="space-y-2 w-64">
                                    <Textarea
                                      placeholder="Feedback (optional)"
                                      value={feedback}
                                      onChange={(e) => setFeedback(e.target.value)}
                                      className="min-h-[80px]"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          updateReviewMutation.mutate({
                                            reviewId: review.id,
                                            status: "approved",
                                            feedbackText: feedback,
                                          })
                                        }
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          updateReviewMutation.mutate({
                                            reviewId: review.id,
                                            status: "changes_requested",
                                            feedbackText: feedback,
                                          })
                                        }
                                      >
                                        Changes
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          updateReviewMutation.mutate({
                                            reviewId: review.id,
                                            status: "rejected",
                                            feedbackText: feedback,
                                          })
                                        }
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button size="sm" onClick={() => setActiveReview(review.id)}>
                                    Review
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {reviews?.filter((r) => {
                    if (tabValue === "completed") {
                      return ["approved", "rejected", "changes_requested"].includes(r.status || "");
                    }
                    return r.status === tabValue;
                  }).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No reviews in this category</p>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
