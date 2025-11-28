/**
 * Pub/Sub Manager for SNAILDB
 * Publish-Subscribe messaging system
 */

import { EventEmitter } from 'events';
import { Logger } from '../logger';

export interface Subscription {
  id: string;
  pattern: string;
  callback: (message: any) => void;
}

export class PubSubManager extends EventEmitter {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger('PubSub', process.cwd());
  }

  /**
   * Subscribe to channel
   */
  public subscribe(channelPattern: string, callback: (message: any) => void): string {
    const id = `${Date.now()}-${Math.random()}`;
    const subscription: Subscription = { id, pattern: channelPattern, callback };

    if (!this.subscriptions.has(channelPattern)) {
      this.subscriptions.set(channelPattern, []);
    }

    this.subscriptions.get(channelPattern)!.push(subscription);
    this.logger.info(`Subscription added: ${id} -> ${channelPattern}`);

    return id;
  }

  /**
   * Unsubscribe from channel
   */
  public unsubscribe(subscriptionId: string): boolean {
    for (const [pattern, subs] of this.subscriptions) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        this.logger.info(`Subscription removed: ${subscriptionId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Publish message
   */
  public publish(channel: string, message: any): number {
    let count = 0;

    for (const [pattern, subs] of this.subscriptions) {
      if (this.matchPattern(channel, pattern)) {
        for (const sub of subs) {
          try {
            sub.callback(message);
            count++;
          } catch (error) {
            this.logger.error(`Error in subscription callback: ${error}`);
          }
        }
      }
    }

    this.logger.debug(`Published to ${count} subscribers on channel: ${channel}`);
    return count;
  }

  /**
   * Match channel pattern
   */
  private matchPattern(channel: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === channel) return true;

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(channel);
  }

  /**
   * Get subscription count
   */
  public getSubscriptionCount(): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }
}

export default PubSubManager;
