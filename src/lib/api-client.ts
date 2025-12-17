// API Client for self-hosted mode (MySQL backend)
const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// Messages d'erreur en français
const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.',
  'NetworkError': 'Erreur de connexion réseau. Le serveur est peut-être indisponible.',
  'TypeError: Failed to fetch': 'Le serveur ne répond pas. Veuillez réessayer plus tard.',
  'Network request failed': 'La requête réseau a échoué. Vérifiez votre connexion internet.',
  'ERR_CONNECTION_REFUSED': 'Connexion refusée par le serveur.',
  'ERR_NETWORK': 'Erreur réseau. Vérifiez votre connexion.',
  'ECONNREFUSED': 'Le serveur est indisponible.',
  '401': 'Session expirée. Veuillez vous reconnecter.',
  '403': 'Accès non autorisé. Vous n\'avez pas les permissions nécessaires.',
  '404': 'Ressource introuvable.',
  '500': 'Erreur interne du serveur. Veuillez réessayer plus tard.',
  '502': 'Le serveur est temporairement indisponible.',
  '503': 'Service indisponible. Veuillez réessayer dans quelques instants.',
};

function getErrorMessage(error: any, httpStatus?: number): string {
  // Vérifier le code HTTP
  if (httpStatus) {
    const statusKey = httpStatus.toString();
    if (ERROR_MESSAGES[statusKey]) {
      return ERROR_MESSAGES[statusKey];
    }
  }

  // Vérifier le message d'erreur
  const errorMessage = error?.message || error?.toString() || '';
  
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }

  // Message par défaut
  if (errorMessage.toLowerCase().includes('fetch')) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion réseau.';
  }

  return errorMessage || 'Une erreur inattendue s\'est produite.';
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || getErrorMessage(null, response.status);
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error: any) {
      // Gérer les erreurs réseau (Failed to fetch, etc.)
      if (error.name === 'TypeError' || error.message?.includes('fetch')) {
        throw new Error(getErrorMessage(error));
      }
      throw error;
    }
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const result = await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.token = result.access_token;
      localStorage.setItem('auth_token', result.access_token);
      return result;
    } catch (error: any) {
      if (error.message?.includes('fetch') || error.message?.includes('réseau')) {
        throw new Error('Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré.');
      }
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const result = await this.request<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.token = result.access_token;
      localStorage.setItem('auth_token', result.access_token);
      return result;
    } catch (error: any) {
      if (error.message?.includes('fetch') || error.message?.includes('réseau')) {
        throw new Error('Impossible de créer le compte. Vérifiez que le serveur backend est démarré.');
      }
      throw error;
    }
  }

  async getCurrentUser() {
    return this.request<{ user: { id: string; email: string; role: string } }>('/auth/me');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Products
  async getProducts() {
    return this.request<any[]>('/products');
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  }

  // Lines
  async getLines() {
    return this.request<any[]>('/lines');
  }

  async createLine(data: any) {
    return this.request('/lines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLine(id: string, data: any) {
    return this.request(`/lines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLine(id: string) {
    return this.request(`/lines/${id}`, { method: 'DELETE' });
  }

  // Tasks
  async getTasks() {
    return this.request<any[]>('/tasks');
  }

  async getTasksForLine(lineId: string) {
    return this.request<any[]>(`/tasks/line/${lineId}`);
  }

  async createTask(data: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addProductionItem(taskId: string, weight: number, status: string) {
    return this.request(`/tasks/${taskId}/items`, {
      method: 'POST',
      body: JSON.stringify({ weight, status }),
    });
  }

  async getTaskItems(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/items`);
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Terminals
  async getTerminals() {
    return this.request<any[]>('/terminals');
  }

  async createTerminal(data: any) {
    return this.request('/terminals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTerminal(id: string, data: any) {
    return this.request(`/terminals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async pingTerminal(id: string) {
    return this.request(`/terminals/${id}/ping`, { method: 'POST' });
  }

  async deleteTerminal(id: string) {
    return this.request(`/terminals/${id}`, { method: 'DELETE' });
  }

  // Weight Units
  async getWeightUnits() {
    return this.request<any[]>('/weight-units');
  }

  async createWeightUnit(data: any) {
    return this.request('/weight-units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWeightUnit(id: string, data: any) {
    return this.request(`/weight-units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWeightUnit(id: string) {
    return this.request(`/weight-units/${id}`, { method: 'DELETE' });
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async createUser(data: { email: string; password: string; role: string }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUserRole(id: string, role: string) {
    return this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async toggleUserStatus(id: string, is_active: boolean) {
    return this.request(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active }),
    });
  }

  async resetUserPassword(id: string, password: string) {
    return this.request(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
