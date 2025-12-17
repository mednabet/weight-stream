import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Factory, LogIn, Scale, Eye, Package, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Production Manager</span>
          </div>
          
          <Link to="/login">
            <Button variant="default" className="gap-2">
              <LogIn className="w-4 h-4" />
              Se connecter
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 mb-8">
              <Factory className="w-12 h-12 text-primary" />
            </div>
            
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Gestion de lignes de
              <span className="text-primary"> production</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Système de pesage automatique avec détection par photocellule. 
              Interface tactile optimisée pour les opérateurs et tableau de bord temps réel pour les superviseurs.
            </p>

            {/* Features */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <div className="industrial-card text-center">
                <Scale className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-bold mb-2">Pesage temps réel</h3>
                <p className="text-sm text-muted-foreground">Lecture continue de la balance avec état stable/instable</p>
              </div>
              <div className="industrial-card text-center">
                <Eye className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-bold mb-2">Détection automatique</h3>
                <p className="text-sm text-muted-foreground">Photocellule pour capturer chaque pièce automatiquement</p>
              </div>
              <div className="industrial-card text-center">
                <Package className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-bold mb-2">Comptage précis</h3>
                <p className="text-sm text-muted-foreground">Historique complet avec validation poids min/max</p>
              </div>
              <div className="industrial-card text-center">
                <Zap className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-bold mb-2">Temps réel</h3>
                <p className="text-sm text-muted-foreground">WebSocket pour mises à jour instantanées</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Production Manager - Prototype UI/UX</p>
          <p className="mt-1">Données simulées • Connexion: operator1 / demo123</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
