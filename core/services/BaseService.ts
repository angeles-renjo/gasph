import { supabase } from '@/utils/supabase';

export class BaseService<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching ${this.tableName} by ID:`, error);
      throw new Error(`Failed to fetch ${this.tableName}`);
    }

    return data;
  }

  async findAll(): Promise<T[]> {
    const { data, error } = await supabase.from(this.tableName).select('*');

    if (error) {
      console.error(`Error fetching all ${this.tableName}:`, error);
      throw new Error(`Failed to fetch ${this.tableName} list`);
    }

    return data || [];
  }

  async findByFilter(filter: Partial<T>): Promise<T[]> {
    let query = supabase.from(this.tableName).select('*');

    // Apply each filter condition
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${this.tableName} with filter:`, error);
      throw new Error(`Failed to filter ${this.tableName}`);
    }

    return data || [];
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}`);
    }

    return data;
  }

  async update(id: string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(item)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw new Error(`Failed to update ${this.tableName}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}`);
    }
  }
}
