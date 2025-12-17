import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Factory, LogIn, Scale, Eye, Package, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Factory className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <span className="text-lg sm:text-xl font-bold">Production Manager</span>
          </div>
          
          <Link to="/login">
            <Button variant="default" className="gap-2 text-sm sm:text-base">
              <LogIn className="w-4 h-4" />
              <span className="hidden xs:inline">Se connecter</span>
              <span className="xs:hidden">Connexion</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-primary/10 border border-primary/20 mb-6 sm:mb-8">
              <Factory className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
              Gestion de lignes de
              <span className="text-primary"> production</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto px-2">
              Système de pesage automatique avec détection par photocellule. 
              Interface tactile optimisée pour les opérateurs et tableau de bord temps réel pour les superviseurs.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10 md:mb-12">
              <div className="industrial-card text-center p-3 sm:p-4 md:p-6">
                <Scale className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-2 sm:mb-4" />
                <h3 className="font-bold text-sm sm:text-base mb-1 sm:mb-2">Pesage temps réel</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Lecture continue de la balance avec état stable/instable</p>
              </div>
              <div className="industrial-card text-center p-3 sm:p-4 md:p-6">
                <Eye className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-2 sm:mb-4" />
                <h3 className="font-bold text-sm sm:text-base mb-1 sm:mb-2">Détection auto</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Photocellule pour capturer chaque pièce automatiquement</p>
              </div>
              <div className="industrial-card text-center p-3 sm:p-4 md:p-6">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-2 sm:mb-4" />
                <h3 className="font-bold text-sm sm:text-base mb-1 sm:mb-2">Comptage précis</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Historique complet avec validation poids min/max</p>
              </div>
              <div className="industrial-card text-center p-3 sm:p-4 md:p-6">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-2 sm:mb-4" />
                <h3 className="font-bold text-sm sm:text-base mb-1 sm:mb-2">Temps réel</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">WebSocket pour mises à jour instantanées</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 sm:py-6">
        <div className="container mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Production Manager - Développé par <a href="https://netprocess.ma" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NETPROCESS</a></p>
          <p className="mt-1">Connexion: operator1@test.com / demo123</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
