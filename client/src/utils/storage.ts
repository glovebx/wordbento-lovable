// utils/storage.ts

const APP_LOCAL_STORAGE_PREFIX = 'wb_settings_'; // A more general prefix for your application

/**
 * A generic class to manage key-value pairs in local storage.
 * It ensures keys are prefixed and handles basic serialization/deserialization.
 */
class LocalStorageManager {
  private baseKey: string;

  /**
   * @param scope A unique string to scope your storage keys (e.g., 'audioPlayer_audioUrlXYZ', 'theme_settings').
   * This helps prevent key collisions for different features or instances.
   */
  constructor(scope: string = 'default') {
    // Encode the scope to ensure it's safe for use as a localStorage key segment
    this.baseKey = `${APP_LOCAL_STORAGE_PREFIX}${btoa(scope)}_`;
  }

  /**
   * Generates a full localStorage key.
   * @param key The specific key for the item (e.g., 'volume', 'playbackRate').
   * @returns The full localStorage key with prefix and scope.
   */
  private getFullKey(key: string): string {
    return `${this.baseKey}${key}`;
  }

  /**
   * Retrieves a value from local storage.
   * @param key The key of the item to retrieve.
   * @returns The parsed value, or null if not found or an error occurs.
   */
  public getItem<T>(key: string): T | null {
    try {
      const storedValue = localStorage.getItem(this.getFullKey(key));
      if (storedValue === null) {
        return null;
      }
      // Attempt to parse JSON; if it fails, return as a raw string
      try {
        return JSON.parse(storedValue) as T;
      } catch {
        return storedValue as T; // Return as string if not valid JSON
      }
    } catch (error) {
      console.error(`Error retrieving item "${key}" from localStorage:`, error);
      return null;
    }
  }

  /**
   * Saves a value to local storage.
   * Values are stringified as JSON if they are objects, otherwise stored as-is.
   * @param key The key of the item to save.
   * @param value The value to save.
   */
  public setItem<T>(key: string, value: T): void {
    try {
      const stringifiedValue = typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value);
      localStorage.setItem(this.getFullKey(key), stringifiedValue);
    } catch (error) {
      console.error(`Error saving item "${key}" to localStorage:`, error);
    }
  }

  /**
   * Removes an item from local storage.
   * @param key The key of the item to remove.
   */
  public removeItem(key: string): void {
    try {
      localStorage.removeItem(this.getFullKey(key));
    } catch (error) {
      console.error(`Error removing item "${key}" from localStorage:`, error);
    }
  }

  /**
   * Clears all items associated with this manager's scope.
   * Use with caution.
   */
  public clearScope(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.baseKey)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error(`Error clearing scope for "${this.baseKey}" from localStorage:`, error);
    }
  }
}

export default LocalStorageManager;