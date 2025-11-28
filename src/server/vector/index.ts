/**
 * Vector Index for AI/LLM Embeddings
 * Implements HNSW (Hierarchical Navigable Small World) for fast similarity search
 */

export interface VectorNode {
  id: string;
  vector: number[];
  neighbors: Map<number, Set<string>>;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  distance: number;
  metadata?: Record<string, any>;
}

export enum DistanceMetric {
  COSINE = 'cosine',
  EUCLIDEAN = 'euclidean',
  DOT_PRODUCT = 'dot_product',
}

export class VectorIndex {
  private nodes: Map<string, VectorNode> = new Map();
  private dimension: number;
  private M: number = 16; // Number of neighbors per level
  private efConstruction: number = 200; // Size of dynamic candidate list
  private efSearch: number = 50; // Size of dynamic candidate list for search
  private metric: DistanceMetric = DistanceMetric.COSINE;
  private entryPoint: string | null = null;

  constructor(dimension: number, metric: DistanceMetric = DistanceMetric.COSINE) {
    this.dimension = dimension;
    this.metric = metric;
  }

  /**
   * Insert vector with ID
   */
  public insert(id: string, vector: number[], metadata?: Record<string, any>): void {
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
    }

    if (this.nodes.has(id)) {
      // Update existing
      const node = this.nodes.get(id)!;
      node.vector = vector;
      node.metadata = metadata;
    } else {
      // Insert new
      const node: VectorNode = {
        id,
        vector: this.normalize(vector),
        neighbors: new Map(),
        metadata,
      };

      // Initialize entry point if needed
      if (!this.entryPoint) {
        this.entryPoint = id;
        this.nodes.set(id, node);
        return;
      }

      // Find nearest neighbors
      const candidates = this.searchCandidates(vector, this.efConstruction);

      // Insert node
      this.nodes.set(id, node);

      // Add bidirectional links
      const M = Math.min(this.M, candidates.length);
      for (let i = 0; i < Math.min(M, candidates.length); i++) {
        const neighbor = candidates[i];
        this.addLink(id, neighbor.id);
        this.addLink(neighbor.id, id);
      }

      // Prune neighbors if needed
      for (const [_, result] of candidates.entries()) {
        this.pruneNeighbors(result.id);
      }
    }
  }

  /**
   * Search for nearest neighbors
   */
  public search(vector: number[], k: number = 10): SearchResult[] {
    if (!this.entryPoint) {
      return [];
    }

    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
    }

    const normalized = this.normalize(vector);
    const candidates = this.searchCandidates(normalized, Math.max(this.efSearch, k));

    // Return top k results
    return candidates.slice(0, k).map((result) => ({
      id: result.id,
      distance: result.distance,
      metadata: this.nodes.get(result.id)?.metadata,
    }));
  }

  /**
   * Search for candidates
   */
  private searchCandidates(vector: number[], ef: number): SearchResult[] {
    const visited = new Set<string>();
    const candidates: SearchResult[] = [];
    const w: SearchResult[] = [];

    // Start from entry point
    const entryNode = this.nodes.get(this.entryPoint!);
    if (!entryNode) {
      return [];
    }

    const distance = this.distance(vector, entryNode.vector);
    candidates.push({ id: this.entryPoint!, distance });
    visited.add(this.entryPoint!);
    w.push({ id: this.entryPoint!, distance });

    // Search loop
    while (candidates.length > 0) {
      const lowerBound = candidates[candidates.length - 1].distance;

      if (lowerBound > w[w.length - 1].distance) {
        break;
      }

      // Get nearest from candidates
      const nearest = candidates.shift();
      if (!nearest) break;

      // Check neighbors
      const node = this.nodes.get(nearest.id);
      if (!node) continue;

      for (const neighbor of node.neighbors.get(0) || new Set()) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);

        const neighborNode = this.nodes.get(neighbor);
        if (!neighborNode) continue;

        const dist = this.distance(vector, neighborNode.vector);

        if (dist < w[w.length - 1].distance || w.length < ef) {
          candidates.push({ id: neighbor, distance: dist });
          w.push({ id: neighbor, distance: dist });

          // Sort
          candidates.sort((a, b) => b.distance - a.distance);
          w.sort((a, b) => b.distance - a.distance);

          if (w.length > ef) {
            w.pop();
          }
        }
      }
    }

    // Sort by distance ascending
    w.sort((a, b) => a.distance - b.distance);
    return w;
  }

  /**
   * Add link between nodes
   */
  private addLink(from: string, to: string): void {
    const node = this.nodes.get(from);
    if (!node) return;

    if (!node.neighbors.has(0)) {
      node.neighbors.set(0, new Set());
    }
    node.neighbors.get(0)!.add(to);
  }

  /**
   * Prune neighbors to maintain M edges
   */
  private pruneNeighbors(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const neighbors = node.neighbors.get(0);
    if (!neighbors || neighbors.size <= this.M) {
      return;
    }

    // Get all neighbors with distances
    const sorted = Array.from(neighbors)
      .map((id) => {
        const neighbor = this.nodes.get(id);
        if (!neighbor) return null;
        const dist = this.distance(node.vector, neighbor.vector);
        return { id, distance: dist };
      })
      .filter((x): x is { id: string; distance: number } => x !== null)
      .sort((a, b) => a.distance - b.distance);

    // Keep only M closest
    node.neighbors.set(
      0,
      new Set(sorted.slice(0, this.M).map((x) => x.id))
    );
  }

  /**
   * Calculate distance between vectors
   */
  private distance(a: number[], b: number[]): number {
    switch (this.metric) {
      case DistanceMetric.COSINE:
        return this.cosineDistance(a, b);
      case DistanceMetric.EUCLIDEAN:
        return this.euclideanDistance(a, b);
      case DistanceMetric.DOT_PRODUCT:
        return this.dotProductDistance(a, b);
      default:
        return this.cosineDistance(a, b);
    }
  }

  /**
   * Cosine distance (1 - similarity)
   */
  private cosineDistance(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 1;
    }

    const similarity = dotProduct / (normA * normB);
    return 1 - similarity;
  }

  /**
   * Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Dot product distance
   */
  private dotProductDistance(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    // Return negative to convert to distance (higher similarity = lower distance)
    return -dotProduct;
  }

  /**
   * Normalize vector
   */
  private normalize(vector: number[]): number[] {
    let norm = 0;
    for (const v of vector) {
      norm += v * v;
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
      return vector;
    }

    return vector.map((v) => v / norm);
  }

  /**
   * Delete vector
   */
  public delete(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from neighbors
    for (const [, neighbors] of node.neighbors) {
      for (const neighbor of neighbors) {
        const neighborNode = this.nodes.get(neighbor);
        if (neighborNode) {
          for (const [, neighborSet] of neighborNode.neighbors) {
            neighborSet.delete(id);
          }
        }
      }
    }

    // If this was entry point, pick new one
    if (this.entryPoint === id) {
      this.entryPoint = this.nodes.size > 1 
        ? Array.from(this.nodes.keys()).find(k => k !== id) || null
        : null;
    }

    return this.nodes.delete(id);
  }

  /**
   * Get vector statistics
   */
  public getStats() {
    return {
      vectorCount: this.nodes.size,
      dimension: this.dimension,
      metric: this.metric,
      M: this.M,
      efConstruction: this.efConstruction,
      efSearch: this.efSearch,
    };
  }

  /**
   * Get all vectors (for export/backup)
   */
  public getAll(): Array<{ id: string; vector: number[]; metadata?: Record<string, any> }> {
    const result = [];
    for (const [id, node] of this.nodes) {
      result.push({
        id,
        vector: node.vector,
        metadata: node.metadata,
      });
    }
    return result;
  }
}

export default VectorIndex;
