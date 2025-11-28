# Quick Start: Running SNAILDB Examples

## ✅ Prerequisites Checklist

Before running examples, ensure:
- [ ] Node.js 18+ installed
- [ ] npm packages installed: `npm install`
- [ ] TypeScript compiled: `npm run build`
- [ ] SNAILDB server running on `localhost:12222`

## 🚀 Quick Start (5 minutes)

### Step 1: Build TypeScript
```bash
npm run build
```
✅ This compiles all TypeScript files including examples to `dist/`

### Step 2: Start SNAILDB Server
```bash
# In a separate terminal
npm start
# Server should output: "SNAILDB Server listening on port 12222"
```

### Step 3: Run an Example
```bash
# Option A: Use ts-node directly
ts-node examples/src/01-ai-search.ts

# Option B: Use compiled JavaScript
node dist/examples/src/01-ai-search.js
```

Expected output:
```
🚀 E-Commerce Product Recommendations Example

✅ Added product: Winter Jacket
✅ Added product: Summer Shirt
...
✅ Example completed successfully
```

## 📚 Running All Examples

Run the test suite to verify all examples work:

```bash
ts-node examples/test-all.ts
```

Output:
```
╔════════════════════════════════════════════════════════╗
║          SNAILDB Examples Test Runner                  ║
╚════════════════════════════════════════════════════════╝

[01] Testing AI-Powered Search Engine      ... ✅ PASSED
[02] Testing E-Commerce Recommendations    ... ✅ PASSED
...
[08] Testing Queue System                  ... ✅ PASSED

Total Tests: 8
✅ Passed:   8/8
❌ Failed:   0/8
Pass Rate:   100.0%

🎉 All examples passed!
```

## 📖 Example Descriptions

| # | Name | Purpose | Time |
|---|------|---------|------|
| 1 | `01-ai-search.ts` | Search with embeddings | 2-3s |
| 2 | `02-ecommerce.ts` | Product recommendations | 2-3s |
| 3 | `03-llm-memory.ts` | Conversation memory | 2-3s |
| 4 | `04-analytics.ts` | Real-time metrics | 3-4s |
| 5 | `05-session-management.ts` | User sessions | 2-3s |
| 6 | `06-rate-limiting.ts` | Rate limiting | 2-3s |
| 7 | `07-cache-layer.ts` | Caching with TTL | 3-4s |
| 8 | `08-queue-system.ts` | Job queue | 3-4s |

## 🐛 Troubleshooting

### Error: "ECONNREFUSED 127.0.0.1:12222"
```
❌ The SNAILDB server is not running or not on port 12222
✅ Solution: Start the server with npm start in another terminal
```

### Error: "Module not found"
```
❌ Dependencies not installed or TypeScript not compiled
✅ Solution: 
   npm install
   npm run build
```

### Error: "Property does not exist on type"
```
❌ TypeScript compilation failed
✅ Solution: Check tsconfig.json includes examples
   npm run build 2>&1 | head -20
```

### Timeout errors
```
❌ Example taking too long or server unresponsive
✅ Solution:
   - Check server is running: netstat -an | grep 12222
   - Increase timeout in examples (currently 5000ms)
   - Check CPU/memory usage
```

## 📊 Example Workflows

### Example 1: AI Search
```
Create embeddings → Store vectors → Search by similarity → Display results
```

### Example 2: E-Commerce
```
Generate embeddings → Store products → Retrieve recommendations → Filter results
```

### Example 3: LLM Memory
```
Store conversations → Embed text → Search context → Retrieve messages
```

### Example 4: Analytics
```
Record metrics → Group by time bucket → Calculate statistics → Display summary
```

### Example 5: Session Management
```
Create session → Store data → Update session → Check expiration → List sessions
```

### Example 6: Rate Limiting
```
Track requests → Check window → Allow/Block → Calculate reset time → Status
```

### Example 7: Cache
```
Check cache → Cache miss → Fetch data → Store in cache → Return result
```

### Example 8: Queue
```
Enqueue job → Dequeue job → Process job → Complete/Fail → Report stats
```

## 🔧 Configuration

All examples use default settings:
```typescript
const client = new SnailDBClient({ 
  uri: 'snaildb://localhost:12222',
  timeout: 5000 
});
```

To customize:
1. Edit example file
2. Rebuild: `npm run build`
3. Re-run example

## 💡 Tips & Tricks

### Run with Verbose Output
```bash
ts-node examples/src/01-ai-search.ts 2>&1 | tee output.log
```

### Profile Example Performance
```bash
time ts-node examples/src/01-ai-search.ts
```

### Run Examples in Background
```bash
nohup node dist/examples/src/01-ai-search.js &
```

### Monitor Server During Examples
```bash
# In another terminal:
tail -f server.log
```

## 📈 Monitoring

Each example shows status with emojis:
- ✅ Success/Completed
- ❌ Error/Failed
- ⚙️ Processing
- 📊 Statistics
- 🚀 Starting
- ⏰ Timing
- 🔍 Searching
- 📝 Data operations

## 🎯 Learning Outcomes

After running these examples, you'll understand:
- ✅ How to use SNAILDB client
- ✅ Vector storage and search
- ✅ Hash storage for structured data
- ✅ List operations (queues, stacks)
- ✅ Real-time aggregation
- ✅ TTL and expiration
- ✅ Error handling patterns
- ✅ Performance considerations

## 📚 Further Reading

- `examples/README.md` - Full documentation
- `docs/api/REFERENCE.md` - API reference
- `docs/guides/EXAMPLES.md` - Use case descriptions
- `src/client/snaildb-client.ts` - Client implementation
- `tests/snaildb.test.ts` - Unit test examples

## ✨ Next Steps

1. ✅ Run examples to verify setup
2. 📖 Read example code and comments
3. 🔧 Modify examples for your use case
4. 📝 Write your own SNAILDB application
5. 🚀 Deploy to production

---

**Status**: Ready to run!

All examples are compiled and ready. Start the SNAILDB server and run examples now.
