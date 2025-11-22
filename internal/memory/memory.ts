/**
 * SuperMemory™ - AI-Optimized Memory System
 * Four memory types: Long-term, Short-term, Episodic, Semantic
 * Integrated with vector embeddings for semantic search
 */

import { MemoryEntry, MemorySearchOptions, MemoryStats, ConversationState, VectorError } from '../types';
import { HNSWIndex, FlatIndex, DISTANCE_METRICS } from '../vector/index';
import { v4 as uuid } from 'uuid';

export interface ConversationContext {
  conversationId: string;
  participantIds: string[];
  startTime: number;
  messages: MemoryEntry[];
  state: ConversationState;
}

// Long-term memory: Persistent storage with semantic indexing
export class LongTermMemory {
  private storage: Map<string, MemoryEntry> = new Map();
  private index: HNSWIndex;

  constructor() {
    this.index = new HNSWIndex('cosine');
  }

  async store(entry: MemoryEntry): Promise<void> {
    entry.id = entry.id || uuid();
    entry.createdAt = entry.createdAt || Date.now();
    entry.type = 'long_term';

    this.storage.set(entry.id, entry);

    // Index by embedding for semantic search
    if (entry.embedding) {
      this.index.insert({
        id: entry.id,
        data: entry.embedding,
      });
    }
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    return this.storage.get(id) || null;
  }

  async search(query: number[], limit: number = 10): Promise<MemoryEntry[]> {
    const results = this.index.search(query, limit);
    return results.map((result) => this.storage.get(result.id)!).filter(Boolean);
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
    const entry = this.storage.get(id);
    if (entry) {
      entry.metadata = { ...entry.metadata, ...metadata };
      entry.updatedAt = Date.now();
    }
  }

  async delete(id: string): Promise<void> {
    this.storage.delete(id);
  }

  getStats(): MemoryStats {
    return {
      totalEntries: this.storage.size,
      storageUsed: Array.from(this.storage.values()).reduce(
        (sum, entry) => sum + (entry.data ? entry.data.length : 0),
        0
      ),
      indexSize: this.index.getSize(),
      oldestEntry: Math.min(...Array.from(this.storage.values()).map((e) => e.createdAt || 0)),
    };
  }
}

// Short-term memory: High-speed in-memory cache with LRU eviction
export class ShortTermMemory {
  private cache: Map<string, MemoryEntry> = new Map();
  private accessOrder: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async store(entry: MemoryEntry): Promise<void> {
    entry.id = entry.id || uuid();
    entry.createdAt = entry.createdAt || Date.now();
    entry.type = 'short_term';

    if (this.cache.size >= this.maxSize) {
      const lru = this.accessOrder.shift();
      if (lru) this.cache.delete(lru);
    }

    this.cache.set(entry.id, entry);
    this.accessOrder.push(entry.id);
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    const entry = this.cache.get(id);
    if (entry) {
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter((e) => e !== id);
      this.accessOrder.push(id);
    }
    return entry || null;
  }

  async search(query: Partial<MemoryEntry>): Promise<MemoryEntry[]> {
    return Array.from(this.cache.values()).filter((entry) => {
      if (query.data && entry.data !== query.data) return false;
      if (query.metadata && !this.metadataMatches(entry.metadata, query.metadata)) return false;
      return true;
    });
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats(): MemoryStats {
    return {
      totalEntries: this.cache.size,
      storageUsed: Array.from(this.cache.values()).reduce(
        (sum, entry) => sum + (entry.data ? entry.data.length : 0),
        0
      ),
      indexSize: this.cache.size,
      oldestEntry: this.cache.size > 0 ? this.accessOrder[0] : undefined,
    };
  }

  private metadataMatches(actual: Record<string, unknown> | undefined, query: Record<string, unknown>): boolean {
    if (!actual) return false;
    return Object.entries(query).every(([key, value]) => actual[key] === value);
  }
}

// Episodic memory: Event logs with timestamps
export class EpisodicMemory {
  private events: MemoryEntry[] = [];
  private eventIndex: Map<string, number> = new Map();

  async record(entry: MemoryEntry): Promise<void> {
    entry.id = entry.id || uuid();
    entry.createdAt = entry.createdAt || Date.now();
    entry.type = 'episodic';

    this.events.push(entry);
    this.eventIndex.set(entry.id, this.events.length - 1);
  }

  async getTimelineRange(startTime: number, endTime: number): Promise<MemoryEntry[]> {
    return this.events.filter((event) => {
      const time = event.createdAt || 0;
      return time >= startTime && time <= endTime;
    });
  }

  async searchByContext(context: string): Promise<MemoryEntry[]> {
    return this.events.filter((event) => {
      if (event.metadata?.context === context) return true;
      if (event.data?.includes(context)) return true;
      return false;
    });
  }

  async getLastN(n: number): Promise<MemoryEntry[]> {
    return this.events.slice(Math.max(0, this.events.length - n));
  }

  getStats(): MemoryStats {
    return {
      totalEntries: this.events.length,
      storageUsed: this.events.reduce((sum, event) => sum + (event.data ? event.data.length : 0), 0),
      indexSize: this.eventIndex.size,
      oldestEntry: this.events.length > 0 ? this.events[0].createdAt : undefined,
    };
  }
}

// Semantic memory: Embeddings + metadata for knowledge representation
export class SemanticMemory {
  private storage: Map<string, MemoryEntry> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private flatIndex: FlatIndex;

  constructor() {
    this.flatIndex = new FlatIndex('cosine');
  }

  async store(entry: MemoryEntry): Promise<void> {
    entry.id = entry.id || uuid();
    entry.createdAt = entry.createdAt || Date.now();
    entry.type = 'semantic';

    this.storage.set(entry.id, entry);

    if (entry.embedding) {
      this.embeddings.set(entry.id, entry.embedding);
      this.flatIndex.insert({
        id: entry.id,
        data: entry.embedding,
      });
    }

    // Index by category for fast filtering
    const category = entry.metadata?.category as string;
    if (category) {
      if (!this.categoryIndex.has(category)) {
        this.categoryIndex.set(category, new Set());
      }
      this.categoryIndex.get(category)!.add(entry.id);
    }
  }

  async searchBySimilarity(query: number[], limit: number = 10): Promise<MemoryEntry[]> {
    const results = this.flatIndex.search(query, limit);
    return results.map((result) => this.storage.get(result.id)!).filter(Boolean);
  }

  async searchByCategory(category: string): Promise<MemoryEntry[]> {
    const ids = this.categoryIndex.get(category) || new Set();
    return Array.from(ids).map((id) => this.storage.get(id)!).filter(Boolean);
  }

  async getRelated(id: string, limit: number = 10): Promise<MemoryEntry[]> {
    const entry = this.storage.get(id);
    if (!entry?.embedding) return [];

    return this.searchBySimilarity(entry.embedding, limit + 1).filter((e) => e.id !== id);
  }

  getStats(): MemoryStats {
    return {
      totalEntries: this.storage.size,
      storageUsed: this.embeddings.size * 4 * 768, // Assume 768-dim embeddings, 4 bytes per float
      indexSize: this.flatIndex.getSize(),
      categories: this.categoryIndex.size,
    };
  }
}

// Main SuperMemory system
export class SuperMemory {
  private longTerm: LongTermMemory;
  private shortTerm: ShortTermMemory;
  private episodic: EpisodicMemory;
  private semantic: SemanticMemory;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor(shortTermSize: number = 1000) {
    this.longTerm = new LongTermMemory();
    this.shortTerm = new ShortTermMemory(shortTermSize);
    this.episodic = new EpisodicMemory();
    this.semantic = new SemanticMemory();
  }

  // Store entry across all appropriate memory systems
  async remember(entry: MemoryEntry): Promise<void> {
    const importance = entry.metadata?.importance || 'medium';

    // Short-term memory for recent access
    await this.shortTerm.store(entry);

    // Semantic memory for knowledge
    if (entry.embedding) {
      await this.semantic.store(entry);
    }

    // Long-term storage if important
    if (importance === 'high' || importance === 'critical') {
      await this.longTerm.store(entry);
    }

    // Episodic memory for all events
    await this.episodic.record(entry);
  }

  // Retrieve from memory hierarchy
  async recall(id: string): Promise<MemoryEntry | null> {
    // Try short-term first (fastest)
    let entry = await this.shortTerm.retrieve(id);
    if (entry) return entry;

    // Then long-term
    entry = await this.longTerm.retrieve(id);
    if (entry) {
      // Move to short-term for cache
      await this.shortTerm.store(entry);
    }
    return entry;
  }

  // Search across memory systems
  async search(query: MemorySearchOptions): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];

    if (query.embedding) {
      // Semantic search
      const semanticResults = await this.semantic.searchBySimilarity(query.embedding, query.limit || 10);
      results.push(...semanticResults);
    }

    if (query.timeRange) {
      // Timeline search
      const episodicResults = await this.episodic.getTimelineRange(query.timeRange.start, query.timeRange.end);
      results.push(...episodicResults);
    }

    if (query.category) {
      // Category search
      const categoryResults = await this.semantic.searchByCategory(query.category);
      results.push(...categoryResults);
    }

    if (query.context) {
      // Context search
      const contextResults = await this.episodic.searchByContext(query.context);
      results.push(...contextResults);
    }

    // Deduplicate by ID
    const deduped = new Map<string, MemoryEntry>();
    for (const entry of results) {
      if (!deduped.has(entry.id)) {
        deduped.set(entry.id, entry);
      }
    }

    return Array.from(deduped.values()).slice(0, query.limit || 10);
  }

  // Conversation tracking
  async startConversation(participantIds: string[]): Promise<string> {
    const conversationId = uuid();
    this.conversations.set(conversationId, {
      conversationId,
      participantIds,
      startTime: Date.now(),
      messages: [],
      state: {},
    });
    return conversationId;
  }

  async addMessage(conversationId: string, entry: MemoryEntry): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);

    conversation.messages.push(entry);
    await this.remember(entry);
  }

  async getConversation(conversationId: string): Promise<ConversationContext | null> {
    return this.conversations.get(conversationId) || null;
  }

  // Statistics
  getStats(): {
    longTerm: MemoryStats;
    shortTerm: MemoryStats;
    episodic: MemoryStats;
    semantic: MemoryStats;
    conversations: number;
  } {
    return {
      longTerm: this.longTerm.getStats(),
      shortTerm: this.shortTerm.getStats(),
      episodic: this.episodic.getStats(),
      semantic: this.semantic.getStats(),
      conversations: this.conversations.size,
    };
  }

  // Clear short-term memory when needed
  async consolidate(): Promise<void> {
    await this.shortTerm.clear();
  }
}
