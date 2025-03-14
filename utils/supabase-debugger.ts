// utils/supabase-debugger.ts
import { supabase } from './supabase';

/**
 * Utility for debugging Supabase database issues
 */
export class SupabaseDebugger {
  /**
   * Check if a table exists in the database
   * @param tableName The name of the table to check
   * @returns Whether the table exists
   */
  static async tableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  /**
   * Get the schema of a table in the database
   * @param tableName The name of the table to get the schema for
   * @returns The schema of the table
   */
  static async getTableSchema(tableName: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (error) {
        console.error(`Error getting schema for table ${tableName}:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`Error getting schema for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Compare a TypeScript model with a database table schema
   * @param tableName The name of the table to check
   * @param model The TypeScript model to compare
   * @returns Comparison results
   */
  static async compareModelWithTable(
    tableName: string,
    model: any
  ): Promise<{
    matches: boolean;
    missingColumns: string[];
    extraColumns: string[];
    typeMismatches: { column: string; modelType: string; dbType: string }[];
  }> {
    try {
      const schema = await this.getTableSchema(tableName);

      if (!schema || schema.length === 0) {
        return {
          matches: false,
          missingColumns: Object.keys(model),
          extraColumns: [],
          typeMismatches: [],
        };
      }

      const dbColumns = schema.map((col) => col.column_name);
      const modelColumns = Object.keys(model);

      const missingColumns = modelColumns.filter(
        (col) => !dbColumns.includes(this.camelToSnake(col))
      );
      const extraColumns = dbColumns.filter(
        (col) => !modelColumns.includes(this.snakeToCamel(col))
      );

      const typeMismatches = [];

      for (const modelCol of modelColumns) {
        const dbCol = this.camelToSnake(modelCol);
        const dbColInfo = schema.find((col) => col.column_name === dbCol);

        if (dbColInfo) {
          const modelType = typeof model[modelCol];
          let dbType = this.mapPgTypeToJs(dbColInfo.data_type);

          if (
            modelType !== dbType &&
            !(
              modelType === 'object' &&
              dbType === 'string' &&
              model[modelCol] instanceof Date
            )
          ) {
            typeMismatches.push({
              column: modelCol,
              modelType,
              dbType: dbColInfo.data_type,
            });
          }
        }
      }

      return {
        matches:
          missingColumns.length === 0 &&
          extraColumns.length === 0 &&
          typeMismatches.length === 0,
        missingColumns,
        extraColumns,
        typeMismatches,
      };
    } catch (error) {
      console.error(`Error comparing model with table ${tableName}:`, error);
      return {
        matches: false,
        missingColumns: [],
        extraColumns: [],
        typeMismatches: [],
      };
    }
  }

  /**
   * Convert camelCase to snake_case
   * @param str The string to convert
   * @returns The converted string
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase
   * @param str The string to convert
   * @returns The converted string
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Map PostgreSQL data types to JavaScript types
   * @param pgType The PostgreSQL data type
   * @returns The equivalent JavaScript type
   */
  static mapPgTypeToJs(pgType: string): string {
    const pgToJsMap: Record<string, string> = {
      integer: 'number',
      bigint: 'number',
      numeric: 'number',
      decimal: 'number',
      real: 'number',
      'double precision': 'number',
      smallint: 'number',
      text: 'string',
      'character varying': 'string',
      character: 'string',
      varchar: 'string',
      boolean: 'boolean',
      json: 'object',
      jsonb: 'object',
      timestamp: 'object', // For Date objects
      'timestamp with time zone': 'object', // For Date objects
      date: 'object', // For Date objects
    };

    return pgToJsMap[pgType] || 'string';
  }

  /**
   * Run a test query to check database connectivity
   * @returns The result of the test query
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    error?: any;
  }> {
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('pg_stat_activity')
        .select('count(*)', { count: 'exact', head: true });
      const endTime = Date.now();

      if (error) {
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
          error,
        };
      }

      return {
        success: true,
        message: `Connection successful (${endTime - startTime}ms)`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error,
      };
    }
  }
}
