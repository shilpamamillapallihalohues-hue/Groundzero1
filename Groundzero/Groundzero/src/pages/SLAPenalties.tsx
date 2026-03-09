import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Building2,
  FileText
} from 'lucide-react';

interface SLAViolation {
  id: string;
  vendor: string;
  project: string;
  asset: string;
  dueDate: string;
  deliveredDate: string;
  daysLate: number;
  penalty: number;
  status: 'pending' | 'applied' | 'waived';
}

const mockViolations: SLAViolation[] = [
  { id: '1', vendor: 'VFX Studios Pro', project: 'Project Alpha', asset: 'Hero Character v3', dueDate: 'Jan 5', deliveredDate: 'Jan 8', daysLate: 3, penalty: 1500, status: 'pending' },
  { id: '2', vendor: 'Animation House', project: 'Project Beta', asset: 'SC02_SH010', dueDate: 'Dec 28', deliveredDate: 'Jan 3', daysLate: 6, penalty: 3000, status: 'applied' },
  { id: '3', vendor: 'Render Farm Global', project: 'Project Alpha', asset: 'Environment Pack', dueDate: 'Jan 2', deliveredDate: 'Jan 3', daysLate: 1, penalty: 500, status: 'waived' },
];

const SLAPenalties = () => {
  const stats = {
    totalPending: mockViolations.filter(v => v.status === 'pending').reduce((acc, v) => acc + v.penalty, 0),
    totalApplied: mockViolations.filter(v => v.status === 'applied').reduce((acc, v) => acc + v.penalty, 0),
    totalWaived: mockViolations.filter(v => v.status === 'waived').reduce((acc, v) => acc + v.penalty, 0),
    violations: mockViolations.length,
  };

  const getStatusBadge = (status: SLAViolation['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'applied':
        return <Badge className="bg-red-500/10 text-red-600"><DollarSign className="w-3 h-3 mr-1" /> Applied</Badge>;
      case 'waived':
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Waived</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SLA & Penalties</h1>
            <p className="text-muted-foreground">Track vendor delays and auto-penalties</p>
          </div>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Violations</p>
                  <p className="text-2xl font-bold">{stats.violations}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Penalties</p>
                  <p className="text-2xl font-bold text-amber-600">${stats.totalPending.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Applied Penalties</p>
                  <p className="text-2xl font-bold text-red-600">${stats.totalApplied.toLocaleString()}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Waived</p>
                  <p className="text-2xl font-bold text-green-600">${stats.totalWaived.toLocaleString()}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Violations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              SLA Violations
            </CardTitle>
            <CardDescription>Vendor delivery delays and associated penalties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockViolations.map((violation) => (
                <div key={violation.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{violation.vendor}</span>
                        {getStatusBadge(violation.status)}
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Asset:</span> {violation.asset}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Project:</span> {violation.project}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          <span className="text-muted-foreground">Due:</span> {violation.dueDate}
                        </span>
                        <span>
                          <span className="text-muted-foreground">Delivered:</span> {violation.deliveredDate}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {violation.daysLate} days late
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">${violation.penalty.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Penalty Amount</p>
                      {violation.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm">Waive</Button>
                          <Button size="sm" variant="destructive">Apply</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SLA Rules */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Penalty Rules</CardTitle>
            <CardDescription>Automatic penalty calculation based on delay duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">1-2 Days Late</p>
                  <p className="text-sm text-muted-foreground">Minor delay</p>
                </div>
                <Badge variant="outline">$500 per day</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">3-5 Days Late</p>
                  <p className="text-sm text-muted-foreground">Moderate delay</p>
                </div>
                <Badge variant="outline" className="text-amber-600">$750 per day</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">6+ Days Late</p>
                  <p className="text-sm text-muted-foreground">Critical delay</p>
                </div>
                <Badge variant="outline" className="text-red-600">$1000 per day</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SLAPenalties;
