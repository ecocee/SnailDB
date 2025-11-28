# Quick Start Guide 🚀

Get SNAILDB up and running in **5 minutes**.

## Prerequisites

- Node.js 18+ 
- npm 9+
- Git
- 2GB RAM

## Step 1: Clone & Install (2 min)

```bash
git clone https://github.com/ecocee/snaildb.git
cd snaildb
npm install
```

## Step 2: Build (1 min)

```bash
npm run build
```

## Step 3: Start Server (1 min)

```bash
npm run dev
```

Output should show:
```
╔═══════════════════════════════════════╗
║   SNAILDB SERVER v2.0.0              ║
║   AI-Optimized Database              ║
╚═══════════════════════════════════════╝

✨ Server ready at snaildb://localhost:12222
```

## Step 4: Test Connection (1 min)

Create `test-quick.js`:

```typescript
import SnailDBClient from './src/client/snaildb-client';

const client = new SnailDBClient({
  uri: 'snaildb://localhost:12222'
});

await client.connect();
console.log('✅ Connected!');

await client.set('hello', 'world');
const result = await client.get('hello');
console.log('✅ Data:', result);

await client.disconnect();
```

Run:
```bash
npx ts-node test-quick.js
```

## Next Steps

- 📖 [Full Documentation](./README.md)
- 🔧 [API Reference](./API.md)
- 📚 [Examples](./EXAMPLES.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)

## Common Commands

```bash
npm run dev              # Start server (development)
npm run server          # Start server
npm test                # Run tests
npm run test:coverage   # Coverage report
npm run build           # Build TypeScript
npm run lint            # Check code quality
```

## Docker Quick Start

```bash
docker build -t snaildb:latest .
docker run -p 12222:12222 snaildb:latest
```

## Troubleshooting

### Port already in use
```bash
PORT=12223 npm run dev
```

### Connection refused
- Ensure server is running
- Check port: `netstat -ano | findstr 12222`
- Increase timeout: `timeout: 10000`

### Out of memory
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

---

**Need help?** See [README.md](./README.md) or open an [issue](https://github.com/ecocee/snaildb/issues)
