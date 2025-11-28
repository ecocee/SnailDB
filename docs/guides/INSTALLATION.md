# Installation & Setup Guide

## System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **RAM**: Minimum 512MB (1GB+ recommended)
- **Disk**: 100MB for application, additional for data
- **OS**: Linux, macOS, or Windows

## Installation Methods

### Method 1: From Source (Development)

```bash
# Clone repository
git clone https://github.com/ecocee/snaildb.git
cd snaildb

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Server available at: snaildb://localhost:12222
```

### Method 2: From npm (When Published)

```bash
# Install globally
npm install -g snaildb

# Start server
snaildb-server

# Or use as library
npm install snaildb
```

### Method 3: Docker (Recommended for Production)

#### Simple Docker Run
```bash
# Build image
docker build -t snaildb:latest .

# Run container
docker run -p 12222:12222 \
  -v snaildb-data:/app/data \
  -e PORT=12222 \
  -e MAX_MEMORY=512 \
  snaildb:latest
```

#### Docker Compose (Full Stack)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f snaildb

# Stop services
docker-compose down

# Cleanup volumes
docker-compose down -v
```

### Method 4: Kubernetes Deployment

#### Create ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: snaildb-config
data:
  PORT: "12222"
  MAX_MEMORY: "1024"
  LOG_LEVEL: "INFO"
```

#### Create Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: snaildb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: snaildb
  template:
    metadata:
      labels:
        app: snaildb
    spec:
      containers:
      - name: snaildb
        image: snaildb:latest
        ports:
        - containerPort: 12222
        envFrom:
        - configMapRef:
            name: snaildb-config
        volumeMounts:
        - name: data
          mountPath: /app/data
        resources:
          requests:
            memory: "512Mi"
          limits:
            memory: "1Gi"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: snaildb-pvc
```

#### Create Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: snaildb
spec:
  type: ClusterIP
  ports:
  - port: 12222
    targetPort: 12222
  selector:
    app: snaildb
```

#### Deploy
```bash
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Verify
kubectl get pods
kubectl logs -f deployment/snaildb
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=12222                          # Server port
HOST=localhost                      # Server host
NODE_ENV=production                 # Environment

# Memory Management
MAX_MEMORY=512                      # Max memory in MB
EVICTION_POLICY=lru                 # LRU, LFU, TTL, random

# Vector Search
VECTOR_DIMENSION=384                # Embedding dimension
ENABLE_VECTOR_SEARCH=true          # Enable/disable vectors

# Persistence
PERSISTENCE_ENABLED=true            # Enable persistence
DATA_DIR=./data                     # Data directory
CHECKPOINT_INTERVAL=30000          # Checkpoint interval (ms)
WAL_ENABLED=true                   # Write-ahead log

# Logging
LOG_LEVEL=INFO                      # DEBUG, INFO, WARN, ERROR, FATAL
LOG_DIR=./data                      # Log directory

# Security
PASSWORD=                           # Optional server password
AUTH_ENABLED=false                  # Enable authentication

# Replication
REPLICATION_ENABLED=false           # Enable replication
REPLICATION_ROLE=master             # master or slave
MASTER_HOST=localhost               # Master host (for slave)
MASTER_PORT=12222                   # Master port (for slave)
```

### Configuration File

Create `snaildb.config.json`:
```json
{
  "server": {
    "port": 12222,
    "host": "0.0.0.0"
  },
  "memory": {
    "maxMemory": 536870912,
    "evictionPolicy": "lru"
  },
  "vector": {
    "enabled": true,
    "dimension": 384,
    "distanceMetric": "cosine"
  },
  "persistence": {
    "enabled": true,
    "dataDir": "./data",
    "checkpointInterval": 30000,
    "walEnabled": true
  },
  "logging": {
    "level": "INFO",
    "directory": "./data",
    "maxFileSize": 10485760
  },
  "replication": {
    "enabled": false,
    "role": "master"
  }
}
```

### Command Line Arguments

```bash
# Server startup with arguments
npm run server -- \
  --port 12222 \
  --host 0.0.0.0 \
  --max-memory 1024 \
  --data-dir /data/snaildb \
  --password mysecurepass \
  --log-level INFO
```

## Verification

### Check Installation

```bash
# Verify Node.js
node --version  # Should be 18+

# Verify npm
npm --version   # Should be 9+

# Test build
npm run build   # Should complete without errors
```

### Test Connection

```bash
# Create test.js
cat > test-connection.js << 'EOF'
import SnailDBClient from './src/client/snaildb-client.js';

const client = new SnailDBClient({
  uri: 'snaildb://localhost:12222',
  timeout: 5000
});

try {
  await client.connect();
  console.log('✅ Connected successfully!');
  
  await client.set('test:key', 'test:value');
  const result = await client.get('test:key');
  console.log('✅ Data stored and retrieved:', result);
  
  await client.disconnect();
  console.log('✅ Disconnected');
} catch (error) {
  console.error('❌ Error:', error.message);
}
EOF

# Run test
node test-connection.js
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :12222  # macOS/Linux
netstat -ano | findstr :12222  # Windows

# Use different port
PORT=12223 npm run dev
```

### Connection Refused
```bash
# Verify server is running
ps aux | grep node

# Check if port is listening
nc -zv localhost 12222  # macOS/Linux

# Increase connection timeout
const client = new SnailDBClient({
  uri: 'snaildb://localhost:12222',
  timeout: 10000  // 10 seconds
});
```

### Memory Issues
```bash
# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096 npm run dev

# Or configure max memory
MAX_MEMORY=2048 npm run dev
```

### Data Corruption
```bash
# Backup current data
mv data data.backup

# Restart server (will create new data)
npm run dev

# If needed, restore from backup
mv data data.new
mv data.backup data
```

## Performance Tuning

### For Development
```bash
# Single-threaded with quick startup
npm run dev
```

### For Production
```bash
# Build and run compiled version
npm run build
NODE_ENV=production npm run server:prod
```

### Optimize Memory
```bash
# Adjust eviction policy based on workload
EVICTION_POLICY=lfu npm run dev    # For caching
EVICTION_POLICY=ttl npm run dev    # For temporary data
EVICTION_POLICY=random npm run dev # For balanced workload
```

### Optimize Vector Search
```bash
# Adjust vector dimension based on embeddings
VECTOR_DIMENSION=768 npm run dev   # For large models
VECTOR_DIMENSION=384 npm run dev   # For standard models
VECTOR_DIMENSION=128 npm run dev   # For lightweight models
```

## Backup & Recovery

### Automated Backups
```bash
# Backups are created automatically
# Location: data/snapshots/
# Format: RDB_YYYYMMDD_HHMMSS.dat

# List backups
ls -la data/snapshots/
```

### Manual Backup
```bash
# Create backup programmatically
const client = new SnailDBClient({...});
await client.connect();
await client.save();  // Creates RDB snapshot
await client.disconnect();

# Or copy data directory
cp -r data data.backup
```

### Recovery
```bash
# Restore from backup
rm -rf data
cp -r data.backup data
npm run dev

# Server will replay WAL and restore state
```

## Monitoring

### Check Server Status
```bash
# Get metrics
const client = new SnailDBClient({...});
await client.connect();
const stats = await client.stats();
console.log(stats);
// {
//   connections: 5,
//   commands: 10523,
//   errors: 2,
//   uptime: 3600,
//   storage: { keys: 1000, memory: 5242880 }
// }
```

### View Logs
```bash
# Development
npm run dev  # Logs to console

# Production
tail -f data/snaildb.log

# Filter logs
grep "ERROR" data/snaildb.log
grep "WARN" data/snaildb.log
```

## Next Steps

1. Read [API.md](./API.md) for complete API reference
2. Check [EXAMPLES.md](./EXAMPLES.md) for real-world use cases
3. Review [SECURITY.md](./SECURITY.md) for security best practices
4. Explore [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
