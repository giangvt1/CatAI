/**
 * Cache service for MeowBot
 * Provides caching for frequently asked questions and responses
 */

export interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheService<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(defaultTTL = 1000 * 60 * 60 * 24, maxSize = 100) {
    this.defaultTTL = defaultTTL; // Default TTL: 24 hours
    this.maxSize = maxSize;
    
    // Load cache from localStorage if available
    this.loadFromStorage();
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 1000 * 60 * 15); // Clean up every 15 minutes
  }

  // Set an item in the cache
  set(key: string, value: T, ttl = this.defaultTTL): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.removeOldest();
    }
    
    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt: now + ttl
    });
    
    // Persist to localStorage
    this.saveToStorage();
  }

  // Get an item from the cache
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    return item.value;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check expiration
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return false;
    }
    
    return true;
  }

  // Remove an item from the cache
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  // Clear the entire cache
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  // Get all keys in the cache
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Remove expired items
  private cleanup(): void {
    const now = Date.now();
    let hasChanges = false;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.saveToStorage();
    }
  }

  // Remove the oldest item from the cache
  private removeOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem('meowbot_cache', serialized);
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    try {
      const serialized = localStorage.getItem('meowbot_cache');
      if (serialized) {
        const entries = JSON.parse(serialized);
        this.cache = new Map(entries);
        
        // Immediately clean up expired items
        this.cleanup();
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      // If loading fails, start with a fresh cache
      this.cache.clear();
    }
  }
}
