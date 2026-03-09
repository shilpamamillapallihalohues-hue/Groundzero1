import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Building2,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  type: string;
  location: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'on_hold';
  activeProjects: number;
  completedProjects: number;
  slaCompliance: number;
  currentAssignments: number;
}

const mockVendors: Vendor[] = [
  { id: '1', name: 'VFX Studios Pro', type: 'VFX', location: 'Los Angeles, CA', email: 'contact@vfxstudios.com', phone: '+1 555-0101', status: 'active', activeProjects: 3, completedProjects: 15, slaCompliance: 95, currentAssignments: 12 },
  { id: '2', name: 'Render Farm Global', type: 'Rendering', location: 'London, UK', email: 'hello@renderfarm.io', phone: '+44 20 1234 5678', status: 'active', activeProjects: 2, completedProjects: 28, slaCompliance: 98, currentAssignments: 45 },
  { id: '3', name: 'Animation House', type: 'Animation', location: 'Vancouver, BC', email: 'work@animhouse.ca', phone: '+1 604-555-0102', status: 'on_hold', activeProjects: 0, completedProjects: 8, slaCompliance: 82, currentAssignments: 0 },
  { id: '4', name: 'Texture Artists Co', type: 'Texturing', location: 'Mumbai, IN', email: 'studio@textureart.in', phone: '+91 22 1234 5678', status: 'active', activeProjects: 1, completedProjects: 22, slaCompliance: 91, currentAssignments: 8 },
];

const Vendors = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusBadge = (status: Vendor['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'on_hold':
        return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" /> On Hold</Badge>;
    }
  };

  const filteredVendors = mockVendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vendors</h1>
            <p className="text-muted-foreground">Manage external vendor relationships</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold">{mockVendors.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {mockVendors.filter(v => v.status === 'active').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Assignments</p>
                  <p className="text-2xl font-bold">
                    {mockVendors.reduce((acc, v) => acc + v.currentAssignments, 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg SLA Compliance</p>
                  <p className="text-2xl font-bold">
                    {Math.round(mockVendors.reduce((acc, v) => acc + v.slaCompliance, 0) / mockVendors.length)}%
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Vendor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {vendor.name}
                      {getStatusBadge(vendor.status)}
                    </CardTitle>
                    <CardDescription>{vendor.type}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {vendor.location}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {vendor.email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {vendor.phone}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{vendor.activeProjects}</p>
                      <p className="text-xs text-muted-foreground">Active Projects</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{vendor.completedProjects}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{vendor.currentAssignments}</p>
                      <p className="text-xs text-muted-foreground">Assignments</p>
                    </div>
                  </div>

                  {/* SLA Compliance */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">SLA Compliance</span>
                      <span className={`text-sm font-medium ${
                        vendor.slaCompliance >= 90 ? 'text-green-600' : 
                        vendor.slaCompliance >= 80 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {vendor.slaCompliance}%
                      </span>
                    </div>
                    <Progress 
                      value={vendor.slaCompliance} 
                      className={
                        vendor.slaCompliance >= 90 ? '[&>div]:bg-green-500' : 
                        vendor.slaCompliance >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Vendors;
