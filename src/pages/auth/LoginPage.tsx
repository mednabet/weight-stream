import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Factory, Mail, Lock, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export function LoginPage() {
  const navigate = useNavigate();
  const { login, role, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle redirect when authenticated and role is loaded
  useEffect(() => {
    if (isAuthenticated && role && !authLoading) {
      setIsRedirecting(true);
      const redirectPath = role === 'operator' ? '/operator' : role === 'admin' ? '/admin' : '/supervisor';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || 'Erreur de connexion');
        setIsLoading(false);
        return;
      }

      // Stop button loading and show a dedicated redirect state.
      setIsLoading(false);
      setIsRedirecting(true);
      // Actual navigation is handled by the effect once `role` is available.
    } catch {
      setError('Erreur de connexion au serveur');
      setIsLoading(false);
    }
  };

  // Show loading if redirecting (or waiting for role after sign-in)
  if (isRedirecting || (isAuthenticated && !role && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm sm:text-base">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 md:p-8 relative">
      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Accueil</span>
      </Link>
      
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
            <Factory className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Production Manager</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Connectez-vous pour accéder au terminal
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 sm:h-14 text-base sm:text-lg pl-10 sm:pl-12"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 sm:h-14 text-base sm:text-lg pl-10 sm:pl-12"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !email || !password}
            className="w-full h-12 sm:h-14 text-base sm:text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        {/* Info */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Contactez votre administrateur ou superviseur pour obtenir un compte.
          </p>
        </div>
      </div>
    </div>
  );
}
