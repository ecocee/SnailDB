# SNAILDB v2.0 - Deployment Guide

## 🚀 Deployment Options

### Quick Comparison

| Option | Complexity | Scalability | Cost | Best For |
|--------|-----------|-------------|------|----------|
| **Standalone** | ⭐ Low | Single instance | Low | Development, small apps |
| **Docker** | ⭐⭐ Medium | With orchestration | Low-Medium | Containerized deployments |
| **Kubernetes** | ⭐⭐⭐ High | Excellent | Medium-High | Enterprise, cloud-native |
| **Cloud Managed** | ⭐ Low | Full scaling | High | Zero-ops, fully managed |

---

## 🏠 Standalone Deployment

### Basic Setup

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Start server
npm run dev

# Server runs on port 12222
```

### Production Setup (Linux/macOS)

```bash
# 1. Create dedicated user
sudo useradd -m -s /bin/bash snaildb

# 2. Create data directory
sudo mkdir -p /opt/snaildb/data
sudo chown snaildb:snaildb /opt/snaildb

# 3. Deploy application
sudo mkdir -p /opt/snaildb/app
sudo cp -r dist/* /opt/snaildb/app/
sudo chown -R snaildb:snaildb /opt/snaildb

# 4. Create systemd service
sudo cat > /etc/systemd/system/snaildb.service << 'EOF'
[Unit]
Description=SNAILDB Server
After=network.target

[Service]
Type=simple
User=snaildb
WorkingDirectory=/opt/snaildb/app
Environment="NODE_ENV=production"
Environment="SNAILDB_PASSWORD=your-secure-password"
Environment="SNAILDB_DATA_DIR=/opt/snaildb/data"
ExecStart=/usr/bin/node dist/server/snaildb-server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 5. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable snaildb
sudo systemctl start snaildb

# 6. Check status
sudo systemctl status snaildb
sudo journalctl -u snaildb -f
```

### Systemd Service with Monitoring

```ini
[Unit]
Description=SNAILDB Server
After=network.target
Wants=snaildb-monitor.service

[Service]
Type=simple
User=snaildb
WorkingDirectory=/opt/snaildb/app
Environment="NODE_ENV=production"
Environment="SNAILDB_PASSWORD=${PASSWORD}"
Environment="SNAILDB_DATA_DIR=/opt/snaildb/data"
Environment="SNAILDB_PORT=12222"
Environment="MAX_CONNECTIONS=1000"
ExecStart=/usr/bin/node dist/server/snaildb-server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Limits
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 12222

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('net').createConnection({port:12222}).destroy()"

# Start server
CMD ["node", "dist/server/snaildb-server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  snaildb:
    build: .
    container_name: snaildb
    ports:
      - "12222:12222"
    environment:
      NODE_ENV: production
      SNAILDB_PASSWORD: ${SNAILDB_PASSWORD:-secure-password-123}
      SNAILDB_DATA_DIR: /app/data
      SNAILDB_PORT: 12222
      MAX_CONNECTIONS: 1000
    volumes:
      - snaildb-data:/app/data
    networks:
      - snaildb-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('net').createConnection({port:12222}).destroy()"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Optional: Backup service
  backup:
    image: alpine:latest
    container_name: snaildb-backup
    volumes:
      - snaildb-data:/data
      - ./backups:/backups
    command: >
      sh -c "while true; do
        mkdir -p /backups/$$(date +%Y-%m-%d);
        cp -r /data/* /backups/$$(date +%Y-%m-%d)/ || true;
        sleep 86400;
      done"
    networks:
      - snaildb-network
    restart: unless-stopped

volumes:
  snaildb-data:

networks:
  snaildb-network:
    driver: bridge
```

### Docker Commands

```bash
# Build image
docker build -t snaildb:latest .

# Run container
docker run -d \
  --name snaildb \
  -p 12222:12222 \
  -e SNAILDB_PASSWORD="your-password" \
  -v snaildb-data:/app/data \
  snaildb:latest

# View logs
docker logs -f snaildb

# Enter container
docker exec -it snaildb sh

# Stop gracefully
docker stop snaildb

# Remove
docker rm snaildb
```

---

## ☸️ Kubernetes Deployment

### StatefulSet Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: snaildb-config
data:
  snaildb.conf: |
    NODE_ENV=production
    SNAILDB_PORT=12222
    MAX_CONNECTIONS=1000

---
apiVersion: v1
kind: Secret
metadata:
  name: snaildb-secret
type: Opaque
stringData:
  password: "your-secure-password-change-me"

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: snaildb
  labels:
    app: snaildb
spec:
  serviceName: snaildb
  replicas: 3
  selector:
    matchLabels:
      app: snaildb
  template:
    metadata:
      labels:
        app: snaildb
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - snaildb
              topologyKey: kubernetes.io/hostname
      
      containers:
      - name: snaildb
        image: snaildb:latest
        imagePullPolicy: IfNotPresent
        
        ports:
        - containerPort: 12222
          name: server
          protocol: TCP
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: SNAILDB_PORT
          value: "12222"
        - name: SNAILDB_DATA_DIR
          value: "/data"
        - name: SNAILDB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: snaildb-secret
              key: password
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        
        livenessProbe:
          tcpSocket:
            port: 12222
          initialDelaySeconds: 15
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        
        readinessProbe:
          tcpSocket:
            port: 12222
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /app/config
          readOnly: true
      
      securityContext:
        fsGroup: 1000
        runAsNonRoot: true
        runAsUser: 1000
  
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "standard"
      resources:
        requests:
          storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: snaildb
  labels:
    app: snaildb
spec:
  clusterIP: None
  selector:
    app: snaildb
  ports:
  - port: 12222
    targetPort: 12222
    protocol: TCP
    name: server

---
apiVersion: v1
kind: Service
metadata:
  name: snaildb-lb
  labels:
    app: snaildb
spec:
  type: LoadBalancer
  selector:
    app: snaildb
  ports:
  - port: 12222
    targetPort: 12222
    protocol: TCP
    name: server

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: snaildb-netpol
spec:
  podSelector:
    matchLabels:
      app: snaildb
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: client
    ports:
    - protocol: TCP
      port: 12222
  egress:
  - to:
    - podSelector: {}
```

### Kubernetes Commands

```bash
# Create namespace
kubectl create namespace snaildb

# Apply manifests
kubectl apply -f k8s/ -n snaildb

# Check StatefulSet
kubectl get statefulset -n snaildb
kubectl describe statefulset snaildb -n snaildb

# Check pods
kubectl get pods -n snaildb
kubectl logs -f snaildb-0 -n snaildb

# Port forward for testing
kubectl port-forward svc/snaildb-lb 12222:12222 -n snaildb

# Scale up/down
kubectl scale statefulset snaildb --replicas=5 -n snaildb

# Rollout new version
kubectl set image statefulset/snaildb snaildb=snaildb:v2.0 -n snaildb
kubectl rollout status statefulset/snaildb -n snaildb
```

---

## ☁️ Cloud Platform Deployment

### AWS ECS

```json
{
  "family": "snaildb",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "snaildb",
      "image": "snaildb:latest",
      "portMappings": [
        {
          "containerPort": 12222,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "snaildb-data",
          "containerPath": "/app/data"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/snaildb",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "snaildb-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-1234567",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

### Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/snaildb

# Deploy
gcloud run deploy snaildb \
  --image gcr.io/PROJECT_ID/snaildb \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,SNAILDB_PASSWORD=your-password" \
  --allow-unauthenticated \
  --port 12222
```

### Azure Container Instances

```bash
# Create resource group
az group create --name snaildb-rg --location eastus

# Deploy container
az container create \
  --resource-group snaildb-rg \
  --name snaildb \
  --image snaildb:latest \
  --ports 12222 \
  --environment-variables \
    NODE_ENV=production \
    SNAILDB_PASSWORD=your-password \
  --memory 1 \
  --cpu 1 \
  --dns-name-label snaildb
```

---

## 📊 Monitoring & Observability

### Prometheus Integration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: snaildb-metrics
spec:
  ports:
  - port: 9090
    targetPort: 9090
  selector:
    app: snaildb

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'snaildb'
      static_configs:
      - targets: ['localhost:9090']
```

### Health Check

```typescript
// health endpoint (if added to server)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: server.connections.size,
  });
});
```

---

## 🔄 Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/snaildb"
DATA_DIR="/opt/snaildb/data"
RETENTION_DAYS=30

# Create backup
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/snaildb_$TIMESTAMP.tar.gz"

tar -czf "$BACKUP_PATH" "$DATA_DIR"

# Encrypt backup
openssl enc -aes-256-cbc -salt -in "$BACKUP_PATH" \
  -out "$BACKUP_PATH.enc" -pass env:BACKUP_PASSWORD

rm "$BACKUP_PATH"

# Clean old backups
find "$BACKUP_DIR" -name "*.enc" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_PATH.enc"
```

### Cron Job for Hourly Backups

```bash
# Add to crontab
0 * * * * /opt/snaildb/backup.sh >> /var/log/snaildb-backup.log 2>&1

# View crontab
crontab -l

# Edit crontab
crontab -e
```

### Recovery Procedure

```bash
# 1. Stop server
sudo systemctl stop snaildb

# 2. Decrypt backup
openssl enc -aes-256-cbc -d -in backup_20240115.tar.gz.enc \
  -out backup_20240115.tar.gz -pass env:BACKUP_PASSWORD

# 3. Extract
tar -xzf backup_20240115.tar.gz -C /

# 4. Start server
sudo systemctl start snaildb

# 5. Verify
sudo journalctl -u snaildb -n 50
```

---

## 🔒 Production Hardening Checklist

### Security
- [ ] Enable password authentication
- [ ] Configure firewall rules
- [ ] Deploy behind reverse proxy with TLS
- [ ] Enable encryption at rest (OS-level)
- [ ] Set proper file permissions (700 for data dir)
- [ ] Create dedicated user (snaildb)
- [ ] Disable root login
- [ ] Enable SELinux/AppArmor

### Operations
- [ ] Configure automated backups
- [ ] Set up monitoring and alerting
- [ ] Document runbooks
- [ ] Plan disaster recovery
- [ ] Test backup restoration
- [ ] Set up centralized logging
- [ ] Configure log rotation
- [ ] Enable audit logging

### Performance
- [ ] Tune system limits (file descriptors, connections)
- [ ] Configure appropriate memory limits
- [ ] Set CPU affinity if needed
- [ ] Monitor and optimize eviction policies
- [ ] Use fast storage (SSD) for data
- [ ] Consider read replicas for scaling

### Compliance
- [ ] Document data retention policy
- [ ] Set up GDPR compliance (right to deletion)
- [ ] Enable access logging
- [ ] Document security procedures
- [ ] Define incident response plan
- [ ] Schedule security audits

---

## 📈 Scaling Strategies

### Vertical Scaling

```bash
# Increase container resources
kubectl set resources statefulset snaildb \
  --limits=cpu=4000m,memory=4Gi \
  --requests=cpu=2000m,memory=2Gi
```

### Horizontal Scaling

```bash
# Increase replicas
kubectl scale statefulset snaildb --replicas=10

# With autoscaling
kubectl autoscale statefulset snaildb --min=3 --max=20 --cpu-percent=70
```

### Data Partitioning

```typescript
// Client-side sharding
const serverCount = 5;
const serverId = hash(key) % serverCount;
const client = clients[serverId];
const result = await client.get(key);
```

---

## 🧪 Testing Deployment

### Load Testing

```bash
# Using ab (Apache Bench)
ab -n 10000 -c 100 \
  -H "Authorization: Bearer token" \
  http://localhost:12222

# Using k6
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100,
  duration: '30s',
};

export default function() {
  let res = http.get('http://snaildb:12222');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}

# Run: k6 run load-test.js
```

### Chaos Testing

```bash
# Kill random pod
kubectl delete pod snaildb-1 -n snaildb

# Network latency
kubectl exec -it snaildb-0 -n snaildb -- \
  tc qdisc add dev eth0 root netem delay 100ms

# Recover
kubectl exec -it snaildb-0 -n snaildb -- \
  tc qdisc del dev eth0 root
```

---

**Production deployment complete! Monitor regularly and update documentation as you learn from operations.**
