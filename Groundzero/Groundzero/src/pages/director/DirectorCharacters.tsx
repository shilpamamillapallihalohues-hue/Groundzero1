// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DirectorCharacters() {
  const { data: characters, isLoading } = useQuery({
    queryKey: ['director-characters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('character_proxies')
        .select(`
          *,
          projects (
            id,
            name
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Characters</h1>
        <p className="text-muted-foreground">Review character designs and development ({characters?.length || 0} total)</p>
      </div>

      {characters && characters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character) => (
            <Card key={character.id} className="overflow-hidden">
              {character.front_view_url ? (
                <img 
                  src={character.front_view_url} 
                  alt={character.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <User className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-lg">{character.name}</span>
                  <Badge variant={character.status === 'approved' ? 'default' : 'secondary'}>
                    {character.status || 'draft'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {character.gender && (
                    <Badge variant="outline" className="text-xs">{character.gender}</Badge>
                  )}
                  {character.age_range && (
                    <Badge variant="outline" className="text-xs">{character.age_range}</Badge>
                  )}
                  {character.body_build && (
                    <Badge variant="outline" className="text-xs">{character.body_build}</Badge>
                  )}
                </div>
                {character.distinguishing_features && character.distinguishing_features.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {character.distinguishing_features.slice(0, 2).join(', ')}
                  </p>
                )}
                <Button size="sm" variant="outline" className="w-full">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No characters</h3>
            <p className="text-sm text-muted-foreground">Character designs will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}