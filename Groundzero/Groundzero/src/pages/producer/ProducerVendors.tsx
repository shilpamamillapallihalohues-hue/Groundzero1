import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ProducerVendors() {
  // Vendors table may not exist - show placeholder
  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Vendors</h1><p className="text-muted-foreground">Manage external vendors</p></div>
        <Card><CardContent className="p-8 text-center"><Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No vendors</h3><p className="text-sm text-muted-foreground">Vendors will appear here when added.</p></CardContent></Card>
      </div>
    </MainLayout>
  );
}
