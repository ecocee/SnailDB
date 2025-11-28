/**
 * Example 5: Session Management
 * Store and manage user sessions with TTL
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

interface SessionData {
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  data: Record<string, any>;
}

async function createSession(userId: string, sessionDuration: number = 3600000): Promise<SessionData> {
  const token = `session:${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  const expiresAt = now + sessionDuration;

  const session: SessionData = {
    userId,
    token,
    createdAt: now,
    expiresAt,
    data: {
      theme: 'dark',
      language: 'en',
      notifications: true,
    },
  };

  // Store session as hash
  await client.hset(token,
    'user_id', userId,
    'created_at', String(now),
    'expires_at', String(expiresAt),
    'data', JSON.stringify(session.data),
  );

  // Add to user's active sessions list
  await client.lpush(`user:${userId}:sessions`, token);

  // Add to session index with TTL
  const sessionIndex = `sessions:active`;
  await client.lpush(sessionIndex, token);

  console.log(`✅ Created session for ${userId}: ${token.split(':')[2]}`);
  return session;
}

async function getSession(token: string): Promise<SessionData | null> {
  try {
    const session = await client.hgetall(token);

    if (!session) {
      return null;
    }

    // Check if session is expired
    const expiresAt = parseInt(String(session.expires_at || 0), 10);
    if (Date.now() > expiresAt) {
      await destroySession(token);
      return null;
    }

    return {
      userId: String(session.user_id),
      token,
      createdAt: parseInt(String(session.created_at || 0), 10),
      expiresAt,
      data: JSON.parse(String(session.data || '{}')),
    };
  } catch (error) {
    console.error(`❌ Error retrieving session: ${error}`);
    return null;
  }
}

async function updateSessionData(token: string, data: Record<string, any>) {
  const session = await getSession(token);

  if (!session) {
    throw new Error('Session not found or expired');
  }

  const updatedData = { ...session.data, ...data };

  await client.hset(token,
    'data', JSON.stringify(updatedData),
  );

  console.log(`✅ Updated session data: ${Object.keys(data).join(', ')}`);
}

async function destroySession(token: string) {
  try {
    await client.del(token);
    console.log(`✅ Destroyed session`);
  } catch (error) {
    console.error(`❌ Error destroying session: ${error}`);
  }
}

async function getActiveSessions(userId: string) {
  const sessions = [];

  try {
    const sessionTokens = await client.lrange(`user:${userId}:sessions`, 0, -1);

    if (Array.isArray(sessionTokens)) {
      for (const token of sessionTokens) {
        const session = await getSession(token);
        if (session) {
          sessions.push(session);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error retrieving active sessions: ${error}`);
  }

  return sessions;
}

async function runExample() {
  try {
    console.log('🚀 Session Management Example\n');

    await client.connect();

    const userId = 'user:12345';

    // Create multiple sessions
    console.log('Creating sessions...\n');
    const session1 = await createSession(userId, 7200000);
    await new Promise(resolve => setTimeout(resolve, 100));
    const session2 = await createSession(userId, 3600000);

    // Update session data
    console.log('\n📝 Updating session data...\n');
    await updateSessionData(session1.token, {
      theme: 'light',
      lastActive: Date.now(),
    });

    // Get single session
    console.log('\n🔍 Retrieving session...\n');
    const retrieved = await getSession(session1.token);
    if (retrieved) {
      console.log(`Session data:`, retrieved.data);
    }

    // Get all active sessions
    console.log('\n📋 Active sessions:\n');
    const activeSessions = await getActiveSessions(userId);
    console.log(`Found ${activeSessions.length} active sessions:`);
    activeSessions.forEach((session, idx) => {
      const duration = ((session.expiresAt - session.createdAt) / 1000 / 60).toFixed(1);
      console.log(`${idx + 1}. Created: ${new Date(session.createdAt).toLocaleTimeString()}, Duration: ${duration}min`);
    });

    // Destroy session
    console.log('\n🗑️ Destroying session...\n');
    await destroySession(session1.token);

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
