import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  User,
  Package
} from 'lucide-react';

interface ReviewRecord {
  id: string;
  assetName: string;
  decision: 'approved' | 'rejected' | 'rework';
  reviewer: string;
  department: string;
  version: string;
  reviewedAt: string;
  notes: string;
}

const mockHistory: ReviewRecord[] = [
  { id: '1', assetName: 'Hero Character', decision: 'approved', reviewer: 'Director Smith', department: '3D Modelling', version: 'v4', reviewedAt: '2024-01-07 14:30', notes: 'Excellent work on the facial details' },
  { id: '2', assetName: 'Alien Creature', decision: 'rework', reviewer: 'Director Smith', department: 'Texturing', version: 'v2', reviewedAt: '2024-01-07 11:00', notes: 'Skin texture needs more detail' },
  { id: '3', assetName: 'SC01_SH010', decision: 'approved', reviewer: 'Director Smith', department: 'Animation', version: 'v3', reviewedAt: '2024-01-06 16:00', notes: 'Motion looks natural' },
  { id: '4', assetName: 'Spaceship Interior', decision: 'rejected', reviewer: 'Director Smith', department: 'Lighting', version: 'v1', reviewedAt: '2024-01-06 10:00', notes: 'Completely wrong mood, start over' },
  { id: '5', assetName: 'Command Center', decision: 'approved', reviewer: 'Director Smith', department: 'Compositing', version: 'v2', reviewedAt: '2024-01-05 15:30', notes: 'Good integration' },
];

const ReviewHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState<string>('all');

  const getDecisionIcon = (decision: ReviewRecord['decision']) => {
    switch (decision) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rework': return <RotateCcw className="h-4 w-4 text-amber-500" />;
    }
  };

  const getDecisionBadge = (decision: ReviewRecord['decision']) => {
    switch (decision) {
      case 'approved': return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      case 'rework': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rework</Badge>;
    }
  };

  const filteredHistory = mockHistory.filter(record => {
    const matchesSearch = record.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterDecision === 'all' || record.decision === filterDecision;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    approved: mockHistory.filter(r => r.decision === 'approved').length,
    rejected: mockHistory.filter(r => r.decision === 'rejected').length,
    rework: mockHistory.filter(r => r.decision === 'rework').length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review History</h1>
          <p className="text-muted-foreground">Track all past approval decisions and feedback</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rework Requested</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.rework}</p>
                </div>
                <RotateCcw className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by asset name or notes..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Decisions</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rework">Rework</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Review Records</CardTitle>
            <CardDescription>Complete history of all review decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredHistory.map((record) => (
                <div key={record.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getDecisionIcon(record.decision)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{record.assetName}</span>
                          <Badge variant="outline">{record.version}</Badge>
                          {getDecisionBadge(record.decision)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{record.department}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {record.reviewer}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {record.reviewedAt}
                      </div>
                    </div>
                  </div>
                  {record.notes && (
                    <div className="mt-2 p-3 bg-background rounded text-sm">
                      <span className="text-muted-foreground">Notes: </span>
                      {record.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ReviewHistory;
