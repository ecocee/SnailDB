/**
 * Command executor for SNAILDB commands
 */

import { StorageEngine, DataType } from '../storage/engine';
import { Logger } from '../logger';

export class CommandExecutor {
  private storage: StorageEngine;
  private logger: Logger;

  constructor(storage: StorageEngine, logger: Logger) {
    this.storage = storage;
    this.logger = logger;
  }

  /**
   * Execute a command
   */
  public async execute(command: string, args: any[], database: number = 0): Promise<any> {
    const cmd = command.toUpperCase();

    try {
      switch (cmd) {
        // String commands
        case 'SET':
          return this.set(args, database);
        case 'GET':
          return this.get(args, database);
        case 'APPEND':
          return this.append(args, database);
        case 'STRLEN':
          return this.strlen(args, database);

        // Key commands
        case 'DEL':
          return this.del(args, database);
        case 'EXISTS':
          return this.exists(args, database);
        case 'TYPE':
          return this.type(args, database);
        case 'EXPIRE':
          return this.expire(args, database);
        case 'TTL':
          return this.ttl(args, database);
        case 'KEYS':
          return this.keys(args, database);

        // List commands
        case 'LPUSH':
          return this.lpush(args, database);
        case 'RPUSH':
          return this.rpush(args, database);
        case 'LPOP':
          return this.lpop(args, database);
        case 'RPOP':
          return this.rpop(args, database);
        case 'LLEN':
          return this.llen(args, database);
        case 'LRANGE':
          return this.lrange(args, database);

        // Hash commands
        case 'HSET':
          return this.hset(args, database);
        case 'HGET':
          return this.hget(args, database);
        case 'HGETALL':
          return this.hgetall(args, database);
        case 'HDEL':
          return this.hdel(args, database);
        case 'HEXISTS':
          return this.hexists(args, database);

        // Set commands
        case 'SADD':
          return this.sadd(args, database);
        case 'SREM':
          return this.srem(args, database);
        case 'SMEMBERS':
          return this.smembers(args, database);
        case 'SCARD':
          return this.scard(args, database);

        // Vector commands
        case 'VECTOR.INSERT':
          return this.vectorInsert(args, database);
        case 'VECTOR.SEARCH':
          return this.vectorSearch(args, database);

        default:
          throw new Error(`Unknown command: ${cmd}`);
      }
    } catch (error) {
      this.logger.error(`Command '${cmd}' failed: ${error}`);
      throw error;
    }
  }

  private set(args: any[], database: number): any {
    const [key, value, ttl] = args;
    if (!key) throw new Error('ERR wrong number of arguments for SET');

    this.storage.set(key, value, DataType.STRING, ttl, database);
    return { ok: true };
  }

  private get(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for GET');

    try {
      return this.storage.get(key, database);
    } catch (error) {
      return null;
    }
  }

  private append(args: any[], database: number): any {
    const [key, value] = args;
    if (!key || value === undefined) throw new Error('ERR wrong number of arguments for APPEND');

    try {
      const existing = this.storage.get(key, database) || '';
      const newValue = String(existing) + String(value);
      this.storage.set(key, newValue, DataType.STRING, undefined, database);
      return newValue.length;
    } catch {
      this.storage.set(key, String(value), DataType.STRING, undefined, database);
      return String(value).length;
    }
  }

  private strlen(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for STRLEN');

    try {
      const value = this.storage.get(key, database);
      return String(value).length;
    } catch {
      return 0;
    }
  }

  private del(args: any[], database: number): any {
    if (!args.length) throw new Error('ERR wrong number of arguments for DEL');

    let count = 0;
    for (const key of args) {
      if (this.storage.delete(key, database)) {
        count++;
      }
    }
    return count;
  }

  private exists(args: any[], database: number): any {
    if (!args.length) throw new Error('ERR wrong number of arguments for EXISTS');

    let count = 0;
    for (const key of args) {
      if (this.storage.exists(key, database)) {
        count++;
      }
    }
    return count;
  }

  private type(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for TYPE');

    const type = this.storage.getType(key, database);
    return type || 'none';
  }

  private expire(args: any[], database: number): any {
    const [key, seconds] = args;
    if (!key || !seconds) throw new Error('ERR wrong number of arguments for EXPIRE');

    // Placeholder - would require TTL support in storage
    return 1;
  }

  private ttl(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for TTL');

    // Placeholder - would require TTL support in storage
    return -1;
  }

  private keys(args: any[], database: number): any {
    const pattern = args[0] || '*';
    return this.storage.keys(pattern, database);
  }

  private lpush(args: any[], database: number): any {
    const [key, ...values] = args;
    if (!key || !values.length) throw new Error('ERR wrong number of arguments for LPUSH');

    try {
      const list = this.storage.get(key, database) || [];
      const updated = [...values.reverse(), ...list];
      this.storage.set(key, updated, DataType.LIST, undefined, database);
      return updated.length;
    } catch {
      this.storage.set(key, [...values.reverse()], DataType.LIST, undefined, database);
      return values.length;
    }
  }

  private rpush(args: any[], database: number): any {
    const [key, ...values] = args;
    if (!key || !values.length) throw new Error('ERR wrong number of arguments for RPUSH');

    try {
      const list = this.storage.get(key, database) || [];
      const updated = [...list, ...values];
      this.storage.set(key, updated, DataType.LIST, undefined, database);
      return updated.length;
    } catch {
      this.storage.set(key, [...values], DataType.LIST, undefined, database);
      return values.length;
    }
  }

  private lpop(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for LPOP');

    try {
      const list = this.storage.get(key, database);
      if (!Array.isArray(list) || list.length === 0) return null;

      const [first, ...rest] = list;
      if (rest.length > 0) {
        this.storage.set(key, rest, DataType.LIST, undefined, database);
      } else {
        this.storage.delete(key, database);
      }
      return first;
    } catch {
      return null;
    }
  }

  private rpop(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for RPOP');

    try {
      const list = this.storage.get(key, database);
      if (!Array.isArray(list) || list.length === 0) return null;

      const last = list[list.length - 1];
      const rest = list.slice(0, -1);
      if (rest.length > 0) {
        this.storage.set(key, rest, DataType.LIST, undefined, database);
      } else {
        this.storage.delete(key, database);
      }
      return last;
    } catch {
      return null;
    }
  }

  private llen(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for LLEN');

    try {
      const list = this.storage.get(key, database);
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  }

  private lrange(args: any[], database: number): any {
    const [key, start, end] = args;
    if (!key || start === undefined || end === undefined)
      throw new Error('ERR wrong number of arguments for LRANGE');

    try {
      const list = this.storage.get(key, database);
      if (!Array.isArray(list)) return [];

      const s = parseInt(String(start));
      const e = parseInt(String(end));
      return list.slice(s, e + 1);
    } catch {
      return [];
    }
  }

  private hset(args: any[], database: number): any {
    const [key, ...pairs] = args;
    if (!key || pairs.length % 2 !== 0) throw new Error('ERR wrong number of arguments for HSET');

    try {
      const hash = this.storage.get(key, database) || {};
      for (let i = 0; i < pairs.length; i += 2) {
        hash[pairs[i]] = pairs[i + 1];
      }
      this.storage.set(key, hash, DataType.HASH, undefined, database);
      return Object.keys(hash).length;
    } catch {
      const hash: Record<string, any> = {};
      for (let i = 0; i < pairs.length; i += 2) {
        hash[pairs[i]] = pairs[i + 1];
      }
      this.storage.set(key, hash, DataType.HASH, undefined, database);
      return Object.keys(hash).length;
    }
  }

  private hget(args: any[], database: number): any {
    const [key, field] = args;
    if (!key || !field) throw new Error('ERR wrong number of arguments for HGET');

    try {
      const hash = this.storage.get(key, database);
      if (typeof hash !== 'object') return null;
      return hash[field] || null;
    } catch {
      return null;
    }
  }

  private hgetall(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for HGETALL');

    try {
      const hash = this.storage.get(key, database);
      if (typeof hash !== 'object') return {};
      return hash;
    } catch {
      return {};
    }
  }

  private hdel(args: any[], database: number): any {
    const [key, ...fields] = args;
    if (!key || !fields.length) throw new Error('ERR wrong number of arguments for HDEL');

    try {
      const hash = this.storage.get(key, database);
      if (typeof hash !== 'object') return 0;

      let deleted = 0;
      for (const field of fields) {
        if (field in hash) {
          delete hash[field];
          deleted++;
        }
      }
      if (Object.keys(hash).length > 0) {
        this.storage.set(key, hash, DataType.HASH, undefined, database);
      } else {
        this.storage.delete(key, database);
      }
      return deleted;
    } catch {
      return 0;
    }
  }

  private hexists(args: any[], database: number): any {
    const [key, field] = args;
    if (!key || !field) throw new Error('ERR wrong number of arguments for HEXISTS');

    try {
      const hash = this.storage.get(key, database);
      if (typeof hash !== 'object') return 0;
      return field in hash ? 1 : 0;
    } catch {
      return 0;
    }
  }

  private sadd(args: any[], database: number): any {
    const [key, ...members] = args;
    if (!key || !members.length) throw new Error('ERR wrong number of arguments for SADD');

    try {
      const set = new Set(this.storage.get(key, database) || []);
      const before = set.size;
      for (const member of members) {
        set.add(member);
      }
      this.storage.set(key, Array.from(set), DataType.SET, undefined, database);
      return set.size - before;
    } catch {
      const set = new Set(members);
      this.storage.set(key, Array.from(set), DataType.SET, undefined, database);
      return set.size;
    }
  }

  private srem(args: any[], database: number): any {
    const [key, ...members] = args;
    if (!key || !members.length) throw new Error('ERR wrong number of arguments for SREM');

    try {
      const set = new Set(this.storage.get(key, database) || []);
      const before = set.size;
      for (const member of members) {
        set.delete(member);
      }
      if (set.size > 0) {
        this.storage.set(key, Array.from(set), DataType.SET, undefined, database);
      } else {
        this.storage.delete(key, database);
      }
      return before - set.size;
    } catch {
      return 0;
    }
  }

  private smembers(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for SMEMBERS');

    try {
      const set = this.storage.get(key, database);
      return Array.isArray(set) ? set : [];
    } catch {
      return [];
    }
  }

  private scard(args: any[], database: number): any {
    const [key] = args;
    if (!key) throw new Error('ERR wrong number of arguments for SCARD');

    try {
      const set = this.storage.get(key, database);
      return Array.isArray(set) ? set.length : 0;
    } catch {
      return 0;
    }
  }

  private vectorInsert(args: any[], database: number): any {
    // Placeholder for vector insert
    return { ok: true };
  }

  private vectorSearch(args: any[], database: number): any {
    // Placeholder for vector search
    return { results: [] };
  }
}

export default CommandExecutor;
