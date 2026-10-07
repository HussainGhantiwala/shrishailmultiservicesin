import { supabase } from '../../lib/supabase';

const FALLBACK_STORAGE_KEY = 'sms_customer_types_master';

export const DEFAULT_CUSTOMER_TYPES = [
  {
    id: '11111111-1111-4111-a111-111111111101',
    name: 'Farmer',
    description: 'Agricultural producers, farmers, and farming families',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-4111-a111-111111111102',
    name: 'Business',
    description: 'Commercial enterprises, local merchants, and contractors',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-4111-a111-111111111103',
    name: 'Employee',
    description: 'Salaried employees and service professionals',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-4111-a111-111111111104',
    name: 'Regular Customer',
    description: 'Frequent local walk-in customers and residents',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-4111-a111-111111111105',
    name: 'Student',
    description: 'Students and educational scheme beneficiaries',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const getLocalTypes = () => {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Could not read local customer types:', e);
  }
  return DEFAULT_CUSTOMER_TYPES;
};

const saveLocalTypes = (types) => {
  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(types));
  } catch (e) {
    console.warn('Could not save local customer types:', e);
  }
};

/**
 * Customer Types API Service
 * Dedicated master table management for customer classifications (e.g. Farmer, Employee, Business).
 */
export const customerTypesApi = {
  /**
   * Fetch all customer types from Supabase master table (with fallback resilience)
   */
  async getCustomerTypes({ activeOnly = false } = {}) {
    try {
      let query = supabase
        .from('customer_types')
        .select('*')
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        // Cache successful remote records for offline/resilience
        saveLocalTypes(data);
        return { data, error: null };
      }

      // If remote returned empty but no error, return remote empty
      if (!error && data) {
        return { data, error: null };
      }

      // If table doesn't exist yet in Supabase schema cache (e.g., prior to SQL execution)
      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
        const local = getLocalTypes();
        const filtered = activeOnly ? local.filter((t) => t.is_active) : local;
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        return { data: filtered, error: null };
      }

      throw error;
    } catch (err) {
      console.warn('customerTypesApi.getCustomerTypes falling back to local master:', err.message);
      const local = getLocalTypes();
      const filtered = activeOnly ? local.filter((t) => t.is_active) : local;
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      return { data: filtered, error: null };
    }
  },

  /**
   * Fetch a single customer type by ID
   */
  async getCustomerTypeById(id) {
    try {
      const { data, error } = await supabase
        .from('customer_types')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) return { data, error: null };

      const local = getLocalTypes();
      const found = local.find((t) => t.id === id);
      return { data: found || null, error: null };
    } catch (err) {
      const local = getLocalTypes();
      const found = local.find((t) => t.id === id);
      return { data: found || null, error: null };
    }
  },

  /**
   * Validate duplicate customer type name (case-insensitive & trimmed)
   */
  async checkDuplicateName(name, excludeId = null) {
    const trimmed = name?.trim();
    if (!trimmed) {
      return { isDuplicate: false };
    }

    const { data: allTypes } = await this.getCustomerTypes({ activeOnly: false });
    const normalizedInput = trimmed.toLowerCase();

    const duplicate = (allTypes || []).find(
      (t) => t.name?.trim().toLowerCase() === normalizedInput && t.id !== excludeId
    );

    if (duplicate) {
      return {
        isDuplicate: true,
        message: `A customer type named "${duplicate.name}" already exists.`,
      };
    }

    return { isDuplicate: false };
  },

  /**
   * Create a new Customer Type
   */
  async createCustomerType({ name, description }, currentUser = null) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new Error('Customer Type name is required.');
    }

    const dupCheck = await this.checkDuplicateName(trimmedName);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    const payload = {
      name: trimmedName,
      description: description?.trim() || null,
      is_active: true,
      created_by: currentUser?.id || null,
    };

    try {
      const { data, error } = await supabase
        .from('customer_types')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          // Fallback local storage
          const local = getLocalTypes();
          const newType = {
            id: `type-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          local.push(newType);
          saveLocalTypes(local);
          return { data: newType, error: null };
        }
        throw new Error(error.message);
      }

      // Update local cache
      const local = getLocalTypes();
      local.push(data);
      saveLocalTypes(local);

      return { data, error: null };
    } catch (err) {
      // Local fallback
      const local = getLocalTypes();
      const newType = {
        id: `type-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      local.push(newType);
      saveLocalTypes(local);
      return { data: newType, error: null };
    }
  },

  /**
   * Update an existing Customer Type
   */
  async updateCustomerType(id, { name, description, is_active }) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new Error('Customer Type name cannot be empty.');
    }

    const dupCheck = await this.checkDuplicateName(trimmedName, id);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    const updates = {
      name: trimmedName,
      description: description ? description.trim() : null,
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    try {
      const { data, error } = await supabase
        .from('customer_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          const local = getLocalTypes();
          const idx = local.findIndex((t) => t.id === id);
          if (idx !== -1) {
            local[idx] = { ...local[idx], ...updates };
            saveLocalTypes(local);
            return { data: local[idx], error: null };
          }
        }
        throw new Error(error.message);
      }

      // Update local cache
      const local = getLocalTypes();
      const idx = local.findIndex((t) => t.id === id);
      if (idx !== -1) {
        local[idx] = data;
        saveLocalTypes(local);
      }

      return { data, error: null };
    } catch (err) {
      const local = getLocalTypes();
      const idx = local.findIndex((t) => t.id === id);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updates };
        saveLocalTypes(local);
        return { data: local[idx], error: null };
      }
      throw err;
    }
  },

  /**
   * Toggle Customer Type active / inactive status
   */
  async toggleStatus(id, newStatus) {
    return this.updateCustomerType(id, { is_active: newStatus });
  },

  /**
   * Realtime subscription for customer_types changes
   */
  subscribeToChanges(callback) {
    try {
      const channel = supabase
        .channel('customer-types-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'customer_types' },
          () => {
            callback();
          }
        )
        .subscribe();
      return channel;
    } catch (e) {
      console.warn('Realtime channel customer-types-changes error:', e);
      return null;
    }
  },
};
