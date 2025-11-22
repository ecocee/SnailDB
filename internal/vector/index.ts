/**
 * Vector Index Engine - Multiple indexing algorithms for AI-optimized search
 * HNSW (Hierarchical Navigable Small World), IVF-Flat, Flat, Product Quantization
 */

import { Vector, VectorIndex, VectorSearchResult, VectorError } from '../types';
import { v4 as uuid } from 'uuid';

export interface DistanceMetric {
  compute(a: number[], b: number[]): number;
}

export const DISTANCE_METRICS: Record<string, DistanceMetric> = {
  cosine: {
    compute(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return 1 - dotProduct / (magnitudeA * magnitudeB + 1e-10);
    },
  },
  euclidean: {
    compute(a: number[], b: number[]): number {
      return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    },
  },
  dot_product: {
    compute(a: number[], b: number[]): number {
      return -a.reduce((sum, val, i) => sum + val * b[i], 0); // Negative for similarity
    },
  },
};

// Hierarchical Navigable Small World - Primary indexing algorithm
export class HNSWIndex implements VectorIndex {
  type = 'hnsw' as const;
  id: string;
  metric: DistanceMetric;
  maxConnections: number = 16;
  efConstruction: number = 200;
  ef: number = 100;
  ml: number = 1.0 / Math.log(2.0);

  private graph: Map<string, HNSWNode> = new Map();
  private entryPoint: HNSWNode | null = null;
  private currentLevel: number = 0;

  constructor(metric: 'cosine' | 'euclidean' | 'dot_product' = 'cosine') {
    this.id = uuid();
    this.metric = DISTANCE_METRICS[metric];
  }

  insert(vector: Vector): void {
    if (vector.id && this.graph.has(vector.id)) {
      throw new VectorError(`Vector ${vector.id} already exists`);
    }

    const node = new HNSWNode(vector.id || uuid(), vector.data);
    const nodeLevel = Math.floor(-Math.log(Math.random()) * this.ml);
    node.level = nodeLevel;

    if (!this.entryPoint) {
      this.entryPoint = node;
      this.graph.set(node.id, node);
      return;
    }

    let nearest = this.entryPoint;
    for (let level = this.currentLevel; level > nodeLevel; level--) {
      nearest = this.searchForNearest(node.data, level, nearest);
    }

    for (let level = Math.min(nodeLevel, this.currentLevel); level >= 0; level--) {
      const candidates = this.searchForNearestNarrow(node.data, level, [nearest], this.efConstruction);
      const m = level === 0 ? this.maxConnections * 2 : this.maxConnections;

      for (const candidate of candidates) {
        const distance = this.metric.compute(node.data, candidate.data);
        node.neighbors.set(level, [...(node.neighbors.get(level) || []), { id: candidate.id, distance }]);

        if (candidate.neighbors.get(level)!.length < m) {
          candidate.neighbors.set(level, [...(candidate.neighbors.get(level) || []), { id: node.id, distance }]);
        } else {
          const farthest = candidate.neighbors
            .get(level)!
            .sort((a, b) => b.distance - a.distance)[0];
          if (distance < farthest.distance) {
            candidate.neighbors.set(
              level,
              candidate
                .neighbors
                .get(level)!
                .filter((n) => n.id !== farthest.id)
                .concat({ id: node.id, distance })
            );
          }
        }
      }

      nearest = candidates[0];
    }

    if (nodeLevel > this.currentLevel) {
      this.entryPoint = node;
      this.currentLevel = nodeLevel;
    }

    this.graph.set(node.id, node);
  }

  search(query: number[], limit: number = 10): VectorSearchResult[] {
    if (!this.entryPoint) return [];

    let nearest = this.entryPoint;
    for (let level = this.currentLevel; level > 0; level--) {
      nearest = this.searchForNearest(query, level, nearest);
    }

    const candidates = this.searchForNearestNarrow(query, 0, [nearest], Math.max(this.ef, limit));
    return candidates
      .slice(0, limit)
      .map((node) => ({
        id: node.id,
        distance: this.metric.compute(query, node.data),
        data: node.data,
      }));
  }

  private searchForNearest(query: number[], level: number, entry: HNSWNode): HNSWNode {
    let nearest = entry;
    let nearestDistance = this.metric.compute(query, entry.data);

    let changed = true;
    while (changed) {
      changed = false;
      const neighbors = nearest.neighbors.get(level) || [];

      for (const neighbor of neighbors) {
        const node = this.graph.get(neighbor.id)!;
        const distance = this.metric.compute(query, node.data);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = node;
          changed = true;
        }
      }
    }

    return nearest;
  }

  private searchForNearestNarrow(
    query: number[],
    level: number,
    entry: HNSWNode[],
    ef: number
  ): HNSWNode[] {
    const visited = new Set<string>();
    const candidates: Array<{ node: HNSWNode; distance: number }> = [];

    for (const node of entry) {
      const distance = this.metric.compute(query, node.data);
      candidates.push({ node, distance });
      visited.add(node.id);
    }

    candidates.sort((a, b) => b.distance - a.distance);

    const results: HNSWNode[] = [];
    for (const { node } of candidates) {
      results.push(node);
    }

    while (candidates.length > 0) {
      const { node: nearest, distance: nearestDistance } = candidates.pop()!;

      if (nearestDistance > results[results.length - 1].metadata?.distance || 0) {
        break;
      }

      const neighbors = nearest.neighbors.get(level) || [];
      for (const neighbor of neighbors) {
        const neighborId = neighbor.id;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighborNode = this.graph.get(neighborId)!;
          const distance = this.metric.compute(query, neighborNode.data);

          if (distance < (results[results.length - 1].metadata?.distance || Infinity) || results.length < ef) {
            candidates.push({ node: neighborNode, distance });
            candidates.sort((a, b) => b.distance - a.distance);

            if (results.length < ef) {
              results.push(neighborNode);
              results.sort((a, b) => {
                const aDistance = this.metric.compute(query, a.data);
                const bDistance = this.metric.compute(query, b.data);
                return bDistance - aDistance;
              });
            } else if (distance < (results[results.length - 1].metadata?.distance || Infinity)) {
              results.pop();
              results.push(neighborNode);
              results.sort((a, b) => {
                const aDistance = this.metric.compute(query, a.data);
                const bDistance = this.metric.compute(query, b.data);
                return bDistance - aDistance;
              });
            }
          }
        }
      }
    }

    return results.slice(0, ef);
  }

  getSize(): number {
    return this.graph.size;
  }
}

// Inverted File Index - for larger datasets with centroids
export class IVFFlatIndex implements VectorIndex {
  type = 'ivf_flat' as const;
  id: string;
  metric: DistanceMetric;
  numCentroids: number;

  private centroids: Array<{ id: string; data: number[] }> = [];
  private invertedLists: Map<string, string[]> = new Map();

  constructor(numCentroids: number = 1000, metric: 'cosine' | 'euclidean' | 'dot_product' = 'cosine') {
    this.id = uuid();
    this.numCentroids = numCentroids;
    this.metric = DISTANCE_METRICS[metric];
  }

  insert(vector: Vector): void {
    if (this.centroids.length === 0) {
      this._initializeCentroids(vector.data.length);
    }

    const nearestCentroid = this._findNearestCentroid(vector.data);
    const centroidId = nearestCentroid.id;

    if (!this.invertedLists.has(centroidId)) {
      this.invertedLists.set(centroidId, []);
    }

    this.invertedLists.get(centroidId)!.push(vector.id || uuid());
  }

  search(query: number[], limit: number = 10): VectorSearchResult[] {
    const distances: Array<{ id: string; distance: number; data: number[] }> = [];

    for (const [centroidId, vectorIds] of this.invertedLists) {
      const centroid = this.centroids.find((c) => c.id === centroidId)!;
      const centroidDistance = this.metric.compute(query, centroid.data);

      for (const vectorId of vectorIds) {
        distances.push({ id: vectorId, distance: centroidDistance, data: centroid.data });
      }
    }

    return distances.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  private _initializeCentroids(dimension: number): void {
    for (let i = 0; i < this.numCentroids; i++) {
      this.centroids.push({
        id: uuid(),
        data: Array(dimension)
          .fill(0)
          .map(() => Math.random()),
      });
    }
  }

  private _findNearestCentroid(vector: number[]): (typeof this.centroids)[0] {
    let nearest = this.centroids[0];
    let minDistance = this.metric.compute(vector, nearest.data);

    for (const centroid of this.centroids) {
      const distance = this.metric.compute(vector, centroid.data);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = centroid;
      }
    }

    return nearest;
  }

  getSize(): number {
    return Array.from(this.invertedLists.values()).reduce((sum, list) => sum + list.length, 0);
  }
}

// Flat (Brute Force) Index - O(n) search, baseline
export class FlatIndex implements VectorIndex {
  type = 'flat' as const;
  id: string;
  metric: DistanceMetric;

  private vectors: Map<string, number[]> = new Map();

  constructor(metric: 'cosine' | 'euclidean' | 'dot_product' = 'cosine') {
    this.id = uuid();
    this.metric = DISTANCE_METRICS[metric];
  }

  insert(vector: Vector): void {
    this.vectors.set(vector.id || uuid(), vector.data);
  }

  search(query: number[], limit: number = 10): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const [id, data] of this.vectors) {
      results.push({
        id,
        distance: this.metric.compute(query, data),
        data,
      });
    }

    return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  getSize(): number {
    return this.vectors.size;
  }
}

// Product Quantization - Compression for large-scale search
export class PQIndex implements VectorIndex {
  type = 'pq' as const;
  id: string;
  metric: DistanceMetric;
  numSubvectors: number;
  bitsPerSubvector: number;

  private codes: Map<string, Uint8Array> = new Map();
  private centroids: number[][][] = [];

  constructor(
    numSubvectors: number = 8,
    bitsPerSubvector: number = 8,
    metric: 'cosine' | 'euclidean' | 'dot_product' = 'cosine'
  ) {
    this.id = uuid();
    this.numSubvectors = numSubvectors;
    this.bitsPerSubvector = bitsPerSubvector;
    this.metric = DISTANCE_METRICS[metric];
  }

  insert(vector: Vector): void {
    const code = this._encode(vector.data);
    this.codes.set(vector.id || uuid(), code);
  }

  search(query: number[], limit: number = 10): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const [id, code] of this.codes) {
      const distance = this._approximateDistance(query, code);
      results.push({
        id,
        distance,
        data: this._decode(code),
      });
    }

    return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  private _encode(vector: number[]): Uint8Array {
    const code = new Uint8Array(this.numSubvectors);
    const subvectorSize = Math.floor(vector.length / this.numSubvectors);

    for (let i = 0; i < this.numSubvectors; i++) {
      const start = i * subvectorSize;
      const end = start + subvectorSize;
      const subvector = vector.slice(start, end);

      let centroidIdx = 0;
      let minDistance = Infinity;

      for (let j = 0; j < (1 << this.bitsPerSubvector); j++) {
        const distance = subvector.reduce((sum, val, idx) => {
          return sum + Math.pow(val - (this.centroids[i]?.[j]?.[idx] || 0), 2);
        }, 0);

        if (distance < minDistance) {
          minDistance = distance;
          centroidIdx = j;
        }
      }

      code[i] = centroidIdx;
    }

    return code;
  }

  private _decode(code: Uint8Array): number[] {
    const vector: number[] = [];

    for (let i = 0; i < this.numSubvectors; i++) {
      const centroidIdx = code[i];
      const centroid = this.centroids[i]?.[centroidIdx] || [];
      vector.push(...centroid);
    }

    return vector;
  }

  private _approximateDistance(query: number[], code: Uint8Array): number {
    let distance = 0;

    for (let i = 0; i < this.numSubvectors; i++) {
      const centroidIdx = code[i];
      const centroid = this.centroids[i]?.[centroidIdx] || [];
      const subvectorSize = Math.floor(query.length / this.numSubvectors);
      const start = i * subvectorSize;
      const querySubvector = query.slice(start, start + subvectorSize);

      distance += this.metric.compute(querySubvector, centroid);
    }

    return distance;
  }

  getSize(): number {
    return this.codes.size;
  }
}

class HNSWNode {
  neighbors: Map<number, Array<{ id: string; distance: number }>> = new Map();
  level: number = 0;
  metadata?: { distance?: number };

  constructor(readonly id: string, readonly data: number[]) {
    for (let i = 0; i <= this.level; i++) {
      this.neighbors.set(i, []);
    }
  }
}

// Factory for creating appropriate index type
export function createVectorIndex(type: 'hnsw' | 'ivf_flat' | 'flat' | 'pq', metric: 'cosine' | 'euclidean' | 'dot_product'): VectorIndex {
  switch (type) {
    case 'hnsw':
      return new HNSWIndex(metric);
    case 'ivf_flat':
      return new IVFFlatIndex(1000, metric);
    case 'flat':
      return new FlatIndex(metric);
    case 'pq':
      return new PQIndex(8, 8, metric);
    default:
      throw new VectorError(`Unknown index type: ${type}`);
  }
}
