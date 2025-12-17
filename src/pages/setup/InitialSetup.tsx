import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Server, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AppConfig,
  DatabaseConfig,
  DatabaseType,
  defaultConfig,
  defaultPorts,
  databaseTypeLabels,
  validateDatabaseConfig,
  generateConnectionString,
  saveConfig,
} from '@/lib/database-config';

export default function InitialSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'database' | 'app' | 'confirm'>('database');
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const updateDatabaseConfig = (updates: Partial<DatabaseConfig>) => {
    setConfig(prev => ({
      ...prev,
      database: { ...prev.database, ...updates },
    }));
    setTestResult(null);
  };

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    updateDatabaseConfig({
      type,
      port: defaultPorts[type],
    });
  };

  const handleTestConnection = async () => {
    const validation = validateDatabaseConfig(config.database);
    if (!validation.valid) {
      setTestResult({ success: false, message: validation.errors.join(', ') });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/setup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.database.type,
          host: config.database.host,
          port: config.database.port,
          database: config.database.database,
          username: config.database.username,
          password: config.database.password,
          ssl: config.database.ssl,
          connectionLimit: config.database.poolSize || 10,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestResult({ success: false, message: data.error || 'Connexion impossible' });
      } else {
        setTestResult({ success: true, message: 'Connexion réussie ✅' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Connexion impossible' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFinishSetup = () => {
    const validation = validateDatabaseConfig(config.database);
    if (!validation.valid) {
      toast.error('Configuration invalide', {
        description: validation.errors.join(', '),
      });
      return;
    }

    const finalConfig: AppConfig = {
      ...config,
      initialized: true,
      initializedAt: new Date().toISOString(),
    };

    saveConfig(finalConfig);
    toast.success('Configuration terminée !', {
      description: 'L\'application est prête à être utilisée.',
    });
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Settings className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Configuration Initiale</CardTitle>
          <CardDescription>
            Configurez votre application pour la première utilisation
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as typeof currentStep)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Base de données
              </TabsTrigger>
              <TabsTrigger value="app" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Application
              </TabsTrigger>
              <TabsTrigger value="confirm" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirmation
              </TabsTrigger>
            </TabsList>

            {/* Database Configuration Tab */}
            <TabsContent value="database" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Type de base de données</Label>
                  <Select
                    value={config.database.type}
                    onValueChange={(v) => handleDatabaseTypeChange(v as DatabaseType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(databaseTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.database.type !== 'sqlite' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hôte</Label>
                        <Input
                          placeholder="localhost"
                          value={config.database.host}
                          onChange={(e) => updateDatabaseConfig({ host: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          type="number"
                          value={config.database.port}
                          onChange={(e) => updateDatabaseConfig({ port: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Nom de la base de données</Label>
                      <Input
                        placeholder="production_db"
                        value={config.database.database}
                        onChange={(e) => updateDatabaseConfig({ database: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom d'utilisateur</Label>
                        <Input
                          placeholder="admin"
                          value={config.database.username}
                          onChange={(e) => updateDatabaseConfig({ username: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mot de passe</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={config.database.password}
                            onChange={(e) => updateDatabaseConfig({ password: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Connexion SSL</Label>
                        <p className="text-sm text-muted-foreground">
                          Activer le chiffrement SSL/TLS
                        </p>
                      </div>
                      <Switch
                        checked={config.database.ssl}
                        onCheckedChange={(ssl) => updateDatabaseConfig({ ssl })}
                      />
                    </div>
                  </>
                )}

                {config.database.type === 'sqlite' && (
                  <div className="space-y-2">
                    <Label>Chemin du fichier</Label>
                    <Input
                      placeholder="./data/production.db"
                      value={config.database.database}
                      onChange={(e) => updateDatabaseConfig({ database: e.target.value })}
                    />
                  </div>
                )}

                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex-1"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Test en cours...
                      </>
                    ) : (
                      'Tester la connexion'
                    )}
                  </Button>
                  <Button onClick={() => setCurrentStep('app')} className="flex-1">
                    Suivant
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Application Configuration Tab */}
            <TabsContent value="app" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nom de l'application</Label>
                  <Input
                    value={config.app.name}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      app: { ...prev.app, name: e.target.value },
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Langue</Label>
                    <Select
                      value={config.app.locale}
                      onValueChange={(locale) => setConfig(prev => ({
                        ...prev,
                        app: { ...prev.app, locale },
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr-FR">Français</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="de-DE">Deutsch</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select
                      value={config.app.timezone}
                      onValueChange={(timezone) => setConfig(prev => ({
                        ...prev,
                        app: { ...prev.app, timezone },
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fournisseur d'authentification</Label>
                  <Select
                    value={config.auth.provider}
                    onValueChange={(provider: 'supabase' | 'custom' | 'oauth') => setConfig(prev => ({
                      ...prev,
                      auth: { ...prev.auth, provider },
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supabase">Supabase Auth (défaut)</SelectItem>
                      <SelectItem value="custom">Authentification personnalisée</SelectItem>
                      <SelectItem value="oauth">OAuth 2.0 / OIDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Durée de session (minutes)</Label>
                  <Input
                    type="number"
                    value={config.auth.sessionTimeout}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      auth: { ...prev.auth, sessionTimeout: parseInt(e.target.value) || 60 },
                    }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep('database')} className="flex-1">
                    Précédent
                  </Button>
                  <Button onClick={() => setCurrentStep('confirm')} className="flex-1">
                    Suivant
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Confirmation Tab */}
            <TabsContent value="confirm" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vérifiez votre configuration avant de finaliser l'installation.
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Base de données
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>Type:</strong> {databaseTypeLabels[config.database.type]}</p>
                    <p><strong>Connexion:</strong> {generateConnectionString(config.database)}</p>
                    <p><strong>SSL:</strong> {config.database.ssl ? 'Activé' : 'Désactivé'}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Application
                  </h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>Nom:</strong> {config.app.name}</p>
                    <p><strong>Langue:</strong> {config.app.locale}</p>
                    <p><strong>Fuseau horaire:</strong> {config.app.timezone}</p>
                    <p><strong>Authentification:</strong> {config.auth.provider}</p>
                    <p><strong>Session:</strong> {config.auth.sessionTimeout} minutes</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep('app')} className="flex-1">
                    Précédent
                  </Button>
                  <Button onClick={handleFinishSetup} className="flex-1">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Terminer la configuration
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
