import { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, ArrowRight, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserMessage, logError } from '@/lib/errors';

const Auth = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: unknown) {
      logError('Auth', error);
      toast.error(getUserMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-info/5 rounded-full blur-3xl pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8 fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 glow-hover transition-all duration-300 hover:scale-110">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Ground Zero
          </h1>
          <p className="text-muted-foreground mt-2">
            Professional Production Management
          </p>
        </div>

        {/* Auth Card */}
        <div className="floating-card p-8 fade-in-up stagger-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <h2 className="text-xl font-semibold text-foreground text-center mb-6">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                  focusedField === 'email' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="pl-10 h-12 bg-secondary/50 border-0 rounded-xl transition-all duration-300 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                  focusedField === 'password' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="pl-10 pr-10 h-12 bg-secondary/50 border-0 rounded-xl transition-all duration-300 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 underline-slide transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl btn-interactive group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Please wait...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 fade-in-up stagger-2" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>Powered by AI-driven production tools</span>
          </div>
        </div>
      </div>
    </div>
  );
});

Auth.displayName = 'Auth';

export default Auth;
