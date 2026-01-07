// Supabase API Client for Lovable Cloud testing
import { supabase } from '@/integrations/supabase/client';

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

class SupabaseApiClient {
  private currentRole: string | null = null;

  isAuthenticated(): boolean {
    return !!supabase.auth.getSession();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Utilisateur non trouvé');

    const role = await this.getUserRole(data.user.id);
    this.currentRole = role;

    return {
      access_token: data.session?.access_token || '',
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role,
      },
    };
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Erreur lors de la création du compte');

    // Default role is 'operator'
    return {
      access_token: data.session?.access_token || '',
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role: 'operator',
      },
    };
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) throw new Error('Non authentifié');

    const role = await this.getUserRole(user.id);
    this.currentRole = role;

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role,
      },
    };
  }

  async getUserRole(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
    if (error) return 'operator';
    return data || 'operator';
  }

  async logout() {
    await supabase.auth.signOut();
    this.currentRole = null;
  }

  // Products
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, weight_unit:weight_units(*)');
    if (error) throw new Error(error.message);
    return data;
  }

  async createProduct(productData: any) {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateProduct(id: string, productData: any) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Lines
  async getLines() {
    const { data, error } = await supabase
      .from('production_lines')
      .select('*, weight_unit:weight_units(*)');
    if (error) throw new Error(error.message);
    return data;
  }

  async createLine(lineData: any) {
    const { data, error } = await supabase
      .from('production_lines')
      .insert(lineData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateLine(id: string, lineData: any) {
    const { data, error } = await supabase
      .from('production_lines')
      .update(lineData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteLine(id: string) {
    const { error } = await supabase
      .from('production_lines')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Tasks
  async getTasks() {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*, product:products(*), line:production_lines(*)');
    if (error) throw new Error(error.message);
    return data;
  }

  async getTasksForLine(lineId: string) {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*, product:products(*)')
      .eq('line_id', lineId);
    if (error) throw new Error(error.message);
    return data;
  }

  async createTask(taskData: any) {
    const { data, error } = await supabase
      .from('production_tasks')
      .insert(taskData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTaskStatus(id: string, status: string) {
    const updateData: any = { status };
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('production_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTask(id: string, taskData: any) {
    const { data, error } = await supabase
      .from('production_tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async addProductionItem(taskId: string, weight: number, status: string) {
    // Get current sequence number
    const { data: items } = await supabase
      .from('production_items')
      .select('sequence')
      .eq('task_id', taskId)
      .order('sequence', { ascending: false })
      .limit(1);

    const nextSequence = items && items.length > 0 ? items[0].sequence + 1 : 1;

    const { data, error } = await supabase
      .from('production_items')
      .insert({
        task_id: taskId,
        weight,
        status,
        sequence: nextSequence,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Update produced quantity manually
    const { count } = await supabase
      .from('production_items')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId);
    
    await supabase
      .from('production_tasks')
      .update({ produced_quantity: count || 0 })
      .eq('id', taskId);

    return data;
  }

  async getTaskItems(taskId: string) {
    const { data, error } = await supabase
      .from('production_items')
      .select('*')
      .eq('task_id', taskId)
      .order('sequence', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('production_tasks')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Terminals
  async getTerminals() {
    const { data, error } = await supabase
      .from('terminals')
      .select('*, line:production_lines(*)');
    if (error) throw new Error(error.message);
    return data;
  }

  async createTerminal(terminalData: any) {
    const { data, error } = await supabase
      .from('terminals')
      .insert(terminalData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTerminal(id: string, terminalData: any) {
    const { data, error } = await supabase
      .from('terminals')
      .update(terminalData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async pingTerminal(id: string) {
    const { data, error } = await supabase
      .from('terminals')
      .update({ last_ping: new Date().toISOString(), is_online: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteTerminal(id: string) {
    const { error } = await supabase
      .from('terminals')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Weight Units
  async getWeightUnits() {
    const { data, error } = await supabase
      .from('weight_units')
      .select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async createWeightUnit(unitData: any) {
    const { data, error } = await supabase
      .from('weight_units')
      .insert(unitData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateWeightUnit(id: string, unitData: any) {
    const { data, error } = await supabase
      .from('weight_units')
      .update(unitData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteWeightUnit(id: string) {
    const { error } = await supabase
      .from('weight_units')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Users (admin only - uses edge function)
  async getUsers() {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*');
    if (error) throw new Error(error.message);
    return data;
  }

  async createUser(userData: { email: string; password: string; role: string }) {
    // This would require an edge function for admin user creation
    throw new Error('Création d\'utilisateur non disponible en mode Supabase');
  }

  async updateUserRole(userId: string, role: 'operator' | 'supervisor' | 'admin') {
    const { data, error } = await supabase
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    throw new Error('Fonction non disponible en mode Supabase');
  }

  async resetUserPassword(userId: string, password: string) {
    throw new Error('Fonction non disponible en mode Supabase');
  }

  async deleteUser(userId: string) {
    throw new Error('Suppression d\'utilisateur non disponible en mode Supabase');
  }
}

export const supabaseApiClient = new SupabaseApiClient();
