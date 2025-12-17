/**
 * Tests automatisés pour la fonctionnalité de paramétrage des unités de mesure
 * 
 * Ce script teste les opérations CRUD sur les unités de poids :
 * - Création d'une unité
 * - Lecture de la liste des unités
 * - Mise à jour d'une unité
 * - Définition d'une unité par défaut
 * - Suppression d'une unité
 * 
 * Exécution : npx ts-node tests/weight-units.test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

interface WeightUnit {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_precision: number;
  is_default: boolean;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

class WeightUnitsTestSuite {
  private token: string = '';
  private results: TestResult[] = [];
  private createdUnitId: string = '';

  async run(): Promise<void> {
    console.log('\n========================================');
    console.log('  Tests des Unités de Mesure');
    console.log('========================================\n');

    // Authentification
    await this.authenticate();

    // Exécution des tests
    await this.testGetAllUnits();
    await this.testCreateUnit();
    await this.testGetUnitById();
    await this.testUpdateUnit();
    await this.testSetDefaultUnit();
    await this.testCreateDuplicateCode();
    await this.testDeleteUnit();
    await this.testCreateUnitWithInvalidData();

    // Affichage des résultats
    this.printResults();
  }

  private async authenticate(): Promise<void> {
    console.log('🔐 Authentification...');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'admin123'
        })
      });

      if (!response.ok) {
        throw new Error(`Échec de l'authentification: ${response.status}`);
      }

      const data = await response.json();
      this.token = data.access_token;
      console.log('✅ Authentification réussie\n');
    } catch (error: any) {
      console.error('❌ Erreur d\'authentification:', error.message);
      process.exit(1);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; status: number; error?: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...((options.headers as Record<string, string>) || {})
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => null);
      
      return {
        data: response.ok ? data : null,
        status: response.status,
        error: !response.ok ? (data?.error || `HTTP ${response.status}`) : undefined
      };
    } catch (error: any) {
      return {
        data: null,
        status: 0,
        error: error.message
      };
    }
  }

  private async runTest(
    name: string,
    testFn: () => Promise<{ passed: boolean; message: string }>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const result = await testFn();
      this.results.push({
        name,
        passed: result.passed,
        message: result.message,
        duration: Date.now() - startTime
      });
      console.log(`${result.passed ? '✅' : '❌'} ${name}`);
      if (!result.passed) {
        console.log(`   └─ ${result.message}`);
      }
    } catch (error: any) {
      this.results.push({
        name,
        passed: false,
        message: error.message,
        duration: Date.now() - startTime
      });
      console.log(`❌ ${name}`);
      console.log(`   └─ ${error.message}`);
    }
  }

  // Test 1: Récupérer toutes les unités
  private async testGetAllUnits(): Promise<void> {
    await this.runTest('GET /weight-units - Récupérer toutes les unités', async () => {
      const { data, status, error } = await this.request<WeightUnit[]>('/weight-units');
      
      if (status !== 200) {
        return { passed: false, message: `Status ${status}: ${error}` };
      }
      
      if (!Array.isArray(data)) {
        return { passed: false, message: 'La réponse n\'est pas un tableau' };
      }

      return { passed: true, message: `${data.length} unité(s) trouvée(s)` };
    });
  }

  // Test 2: Créer une nouvelle unité
  private async testCreateUnit(): Promise<void> {
    await this.runTest('POST /weight-units - Créer une unité de test', async () => {
      const newUnit = {
        code: 'TEST',
        name: 'Unité de Test',
        symbol: 'tst',
        decimal_precision: 2,
        is_default: false
      };

      const { data, status, error } = await this.request<WeightUnit>('/weight-units', {
        method: 'POST',
        body: JSON.stringify(newUnit)
      });

      if (status !== 200) {
        return { passed: false, message: `Status ${status}: ${error}` };
      }

      if (!data?.id) {
        return { passed: false, message: 'ID non retourné' };
      }

      this.createdUnitId = data.id;
      return { passed: true, message: `Unité créée avec ID: ${data.id}` };
    });
  }

  // Test 3: Récupérer une unité par ID (via liste)
  private async testGetUnitById(): Promise<void> {
    await this.runTest('GET /weight-units - Vérifier l\'unité créée', async () => {
      const { data, status, error } = await this.request<WeightUnit[]>('/weight-units');
      
      if (status !== 200) {
        return { passed: false, message: `Status ${status}: ${error}` };
      }

      const unit = data?.find(u => u.id === this.createdUnitId);
      
      if (!unit) {
        return { passed: false, message: 'Unité créée non trouvée dans la liste' };
      }

      if (unit.code !== 'TEST' || unit.name !== 'Unité de Test') {
        return { passed: false, message: 'Données de l\'unité incorrectes' };
      }

      return { passed: true, message: 'Unité trouvée et vérifiée' };
    });
  }

  // Test 4: Mettre à jour une unité
  private async testUpdateUnit(): Promise<void> {
    await this.runTest('PUT /weight-units/:id - Mettre à jour une unité', async () => {
      const updatedData = {
        code: 'TEST',
        name: 'Unité de Test Modifiée',
        symbol: 'tst',
        decimal_precision: 3,
        is_default: false
      };

      const { status, error } = await this.request(`/weight-units/${this.createdUnitId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });

      if (status !== 200) {
        return { passed: false, message: `Status ${status}: ${error}` };
      }

      // Vérifier la mise à jour
      const { data: units } = await this.request<WeightUnit[]>('/weight-units');
      const unit = units?.find(u => u.id === this.createdUnitId);

      if (unit?.name !== 'Unité de Test Modifiée') {
        return { passed: false, message: 'La mise à jour n\'a pas été appliquée' };
      }

      return { passed: true, message: 'Unité mise à jour avec succès' };
    });
  }

  // Test 5: Définir une unité par défaut
  private async testSetDefaultUnit(): Promise<void> {
    await this.runTest('PUT /weight-units/:id - Définir comme unité par défaut', async () => {
      const { status, error } = await this.request(`/weight-units/${this.createdUnitId}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: 'TEST',
          name: 'Unité de Test Modifiée',
          symbol: 'tst',
          decimal_precision: 3,
          is_default: true
        })
      });

      if (status !== 200) {
        return { passed: false, message: `Status ${status}: ${error}` };
      }

      // Vérifier qu'une seule unité est par défaut
      const { data: units } = await this.request<WeightUnit[]>('/weight-units');
      const defaultUnits = units?.filter(u => u.is_default) || [];

      if (defaultUnits.length !== 1) {
        return { passed: false, message: `${defaultUnits.length} unité(s) par défaut au lieu de 1` };
      }

      if (defaultUnits[0].id !== this.createdUnitId) {
        return { passed: false, message: 'Mauvaise unité définie par défaut' };
      }

      return { passed: true, message: 'Unité définie par défaut avec succès' };
    });
  }

  // Test 6: Créer une unité avec un code dupliqué
  private async testCreateDuplicateCode(): Promise<void> {
    await this.runTest('POST /weight-units - Refuser un code dupliqué', async () => {
      const duplicateUnit = {
        code: 'TEST',
        name: 'Autre Unité',
        symbol: 'aut',
        decimal_precision: 1,
        is_default: false
      };

      const { status } = await this.request('/weight-units', {
        method: 'POST',
        body: JSON.stringify(duplicateUnit)
      });

      if (status === 200) {
        return { passed: false, message: 'Le code dupliqué aurait dû être refusé' };
      }

      return { passed: true, message: 'Code dupliqué correctement refusé' };
    });
  }

  // Test 7: Supprimer une unité
  private async testDeleteUnit(): Promise<void> {
    await this.runTest('DELETE /weight-units/:id - Supprimer une unité', async () => {
      // Remettre KG par défaut avant de supprimer TEST
      const { data: units } = await this.request<WeightUnit[]>('/weight-units');
      const kgUnit = units?.find(u => u.code === 'KG');
      
      if (kgUnit) {
        await this.request(`/weight-units/${kgUnit.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            code: 'KG',
            name: 'Kilogramme',
            symbol: 'kg',
            decimal_precision: 3,
            is_default: true
          })
        });
      }

      const { status, error } = await this.request(`/weight-units/${this.createdUnitId}`, {
        method: 'DELETE'
      });

      if (status !== 200) {
        return { passed: false, message: `Status ${status}: ${error}` };
      }

      // Vérifier la suppression
      const { data: unitsAfter } = await this.request<WeightUnit[]>('/weight-units');
      const deletedUnit = unitsAfter?.find(u => u.id === this.createdUnitId);

      if (deletedUnit) {
        return { passed: false, message: 'L\'unité n\'a pas été supprimée' };
      }

      return { passed: true, message: 'Unité supprimée avec succès' };
    });
  }

  // Test 8: Créer une unité avec des données invalides
  private async testCreateUnitWithInvalidData(): Promise<void> {
    await this.runTest('POST /weight-units - Refuser des données invalides', async () => {
      const invalidUnit = {
        code: '',
        name: '',
        symbol: ''
      };

      const { status } = await this.request('/weight-units', {
        method: 'POST',
        body: JSON.stringify(invalidUnit)
      });

      if (status === 200) {
        return { passed: false, message: 'Les données invalides auraient dû être refusées' };
      }

      return { passed: true, message: 'Données invalides correctement refusées' };
    });
  }

  private printResults(): void {
    console.log('\n========================================');
    console.log('  Résumé des Tests');
    console.log('========================================\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total: ${total} tests`);
    console.log(`✅ Réussis: ${passed}`);
    console.log(`❌ Échoués: ${failed}`);
    console.log(`⏱️  Durée: ${totalDuration}ms\n`);

    if (failed > 0) {
      console.log('Tests échoués:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
      console.log('');
    }

    // Code de sortie
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Exécution des tests
const suite = new WeightUnitsTestSuite();
suite.run().catch(console.error);
