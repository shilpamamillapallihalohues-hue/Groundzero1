import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraData {
  position: [number, number, number];
  rotation: [number, number, number];
}

const STORAGE_KEY = 'vp_websocket_url';

export default function CameraScouting() {
  const { toast } = useToast();
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraData, setCameraData] = useState<CameraData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Save URL to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, wsUrl);
  }, [wsUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleConnect = useCallback(() => {
    if (!wsUrl.trim()) {
      toast({
        title: 'Missing URL',
        description: 'Please enter a WebSocket URL',
        variant: 'destructive',
      });
      return;
    }

    // Auto-convert https:// to wss:// and http:// to ws://
    let connectionUrl = wsUrl.trim();
    if (connectionUrl.startsWith('https://')) {
      connectionUrl = connectionUrl.replace('https://', 'wss://');
    } else if (connectionUrl.startsWith('http://')) {
      connectionUrl = connectionUrl.replace('http://', 'ws://');
    }

    // Validate URL format after conversion
    if (!connectionUrl.startsWith('ws://') && !connectionUrl.startsWith('wss://')) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., wss://xxxx.ngrok-free.app)',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);

    try {
      const ws = new WebSocket(connectionUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        toast({
          title: 'Connected',
          description: 'WebSocket connection established',
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CameraData;
          if (data.position && data.rotation) {
            setCameraData(data);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to WebSocket',
          variant: 'destructive',
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
      };
    } catch (error) {
      setIsConnecting(false);
      toast({
        title: 'Connection Failed',
        description: 'Could not establish WebSocket connection',
        variant: 'destructive',
      });
    }
  }, [wsUrl, toast]);

  const handleDisconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      setCameraData(null);
      toast({
        title: 'Disconnected',
        description: 'WebSocket connection closed',
      });
    }
  }, [toast]);

  const formatValue = (value: number) => value.toFixed(3);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Camera Scouting</h1>
            <p className="text-muted-foreground">Virtual camera placement & scouting tools</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
                Connection Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-url">WebSocket URL</Label>
                <Input
                  id="ws-url"
                  type="text"
                  placeholder="wss://xxxx.ngrok-free.app"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  disabled={isConnected || isConnecting}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your ngrok or WebSocket server URL
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!isConnected ? (
                  <Button 
                    onClick={handleConnect} 
                    disabled={isConnecting || !wsUrl.trim()}
                  >
                    {isConnecting ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                )}

                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Live Camera Data */}
          <Card>
            <CardHeader>
              <CardTitle>Live Camera Data</CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <p className="text-muted-foreground text-sm">
                  Connect to a WebSocket server to view live camera data.
                </p>
              ) : !cameraData ? (
                <p className="text-muted-foreground text-sm">
                  Waiting for camera data...
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {/* Position */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Position
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">X</span>
                        <span className="font-mono text-sm">
                          {formatValue(cameraData.position[0])}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">Y</span>
                        <span className="font-mono text-sm">
                          {formatValue(cameraData.position[1])}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">Z</span>
                        <span className="font-mono text-sm">
                          {formatValue(cameraData.position[2])}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Rotation
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">Pitch</span>
                        <span className="font-mono text-sm">
                          {formatValue(cameraData.rotation[0])}°
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">Yaw</span>
                        <span className="font-mono text-sm">
                          {formatValue(cameraData.rotation[1])}°
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">Roll</span>
                        <span className="font-mono text-sm">
                          {formatValue(cameraData.rotation[2])}°
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
