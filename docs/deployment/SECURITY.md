# Security Best Practices & Guidelines

## 🔐 Security Architecture

### Threat Model

SNAILDB is designed for trusted networks and should be deployed in secure environments:

- **Trusted Clients**: Assume clients are authenticated by application layer
- **Internal Network**: Deploy in private network/VPC, not public internet
- **No External Dependencies**: Reduced attack surface

### Security Principles

1. **Defense in Depth** - Multiple layers of protection
2. **Least Privilege** - Minimal permissions by default
3. **Fail Secure** - Errors don't expose sensitive data
4. **Secure by Default** - Safe defaults, explicit opt-in for less secure options

---

## 🛡️ Authentication & Authorization

### Server Password

```bash
# Enable password protection
npm run dev -- --password "your-secure-password"

# Generate secure password
openssl rand -base64 32
```

### Client Connection

```typescript
// With password
const client = new SnailDBClient({
  uri: 'snaildb://localhost:12222?password=your-secure-password',
});

// Via connection string
const client = new SnailDBClient({
  uri: 'snaildb://localhost:12222', // No auth required for local
});
```

### Best Practices

✅ **DO:**
- Use strong, randomly generated passwords
- Rotate passwords quarterly
- Store passwords in environment variables
- Use different passwords per environment
- Enable authentication in production

❌ **DON'T:**
- Use simple or predictable passwords
- Share passwords across environments
- Store passwords in code
- Use default/unchanged passwords
- Disable authentication in production

---

## 🔒 Data Protection

### At-Rest Protection

```bash
# Filesystem permissions
chmod 700 /app/data           # Owner only
chown snaildb:snaildb /app/data

# Disk encryption (OS level)
# Linux: Use LUKS or dm-crypt
# macOS: Use FileVault
# Windows: Use BitLocker
```

### In-Transit Protection

```bash
# SNAILDB Protocol (binary, length-prefixed)
# NOT designed for encryption over the wire

# USE: Reverse proxy with TLS
# Option 1: NGINX with SSL
upstream snaildb {
  server localhost:12222;
}

server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass snaildb;
  }
}

# Option 2: SSH tunnel
# Client: ssh -L 12222:localhost:12222 user@server
# Then connect to localhost:12222

# Option 3: VPN
# Deploy in same VPC/private network
```

### Backup Protection

```bash
# Encrypt backups
# Linux
tar czf - data/ | openssl enc -aes-256-cbc -e > backup.tar.gz.enc
tar xzf <(openssl enc -aes-256-cbc -d -in backup.tar.gz.enc) -C /restore

# Store backups securely
# - Off-site storage
# - Encrypted at rest
# - Access controlled
# - Versioned (multiple snapshots)
```

---

## 🔑 Key Management

### Secrets Management

```typescript
// Use environment variables
const password = process.env.SNAILDB_PASSWORD;
const dataDir = process.env.SNAILDB_DATA_DIR;

// Use secret management systems
// - AWS Secrets Manager
// - HashiCorp Vault
// - Google Secret Manager
// - Azure Key Vault

// Example with dotenv
import dotenv from 'dotenv';
dotenv.config(); // Loads from .env (DO NOT COMMIT)
```

### .env File

```bash
# .env (DO NOT COMMIT TO GIT)
SNAILDB_PASSWORD=your-secure-password
SNAILDB_PORT=12222
SNAILDB_DATA_DIR=/data/snaildb
```

### .gitignore

```
.env
.env.local
*.key
*.pem
data/
backup/
```

---

## 🚨 Error Handling & Information Disclosure

### Safe Error Messages

```typescript
// ❌ UNSAFE - Leaks internal details
const error = `Database error: ${err.message}`;

// ✅ SAFE - Generic message, log details
console.error('Database error:', err); // Internal log
throw new Error('Unable to process request'); // User sees this
```

### Error Logging

```typescript
// Log full details internally
logger.error('Command failed', {
  error: err.message,
  stack: err.stack,
  command: cmd,
  args: args,
  timestamp: Date.now(),
});

// Return generic error to client
res.status(500).json({ error: 'Internal server error' });
```

---

## 🌐 Network Security

### Network Isolation

```yaml
# Kubernetes Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: snaildb-network-policy
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
          app: api-server
    ports:
    - protocol: TCP
      port: 12222
  egress:
  - to:
    - podSelector: {}
```

### Firewall Rules

```bash
# Only allow from trusted sources
# UFW (Ubuntu)
ufw allow from 10.0.0.0/8 to any port 12222

# iptables (Linux)
iptables -A INPUT -p tcp --dport 12222 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 12222 -j DROP
```

### VPC Deployment

```bash
# AWS - Deploy in private subnet
# - No internet gateway route
# - NAT gateway for outbound only
# - Application in same VPC

# GCP - Use private service connection
# - Cloud SQL Proxy for secure access
# - VPC Service Controls

# Azure - Private endpoint
# - Private IP address
# - Only accessible from VNet
```

---

## 🔍 Input Validation

### Command Validation

```typescript
// SNAILDB validates:
// - Command names (whitelist)
// - Number of arguments
// - Argument types
// - Value sizes

// Example
const validCommands = new Set([
  'GET', 'SET', 'DEL', 'VECTOR.SET', 'VECTOR.SEARCH',
]);

if (!validCommands.has(command)) {
  throw new Error(`Invalid command: ${command}`);
}
```

### Size Limits

```bash
# Configure maximum value sizes
MAX_VALUE_SIZE=1048576    # 1MB per value
MAX_VECTOR_DIM=4096       # Max vector dimension
MAX_KEY_LENGTH=512        # Max key length
MAX_LIST_SIZE=1000000     # Max list elements
MAX_BATCH_SIZE=1000       # Max batch operations
```

---

## 🔐 Access Control

### Connection Limits

```bash
# Limit concurrent connections
MAX_CONNECTIONS=1000

# Docker
docker run -e MAX_CONNECTIONS=100 snaildb:latest

# Environment variable
export MAX_CONNECTIONS=100
npm run dev
```

### Per-User Limits

```typescript
// Application-level rate limiting
async function checkRateLimit(userId) {
  const key = `rate_limit:${userId}`;
  const count = await client.get(key) || 0;
  
  if (count >= 1000) { // 1000 req/hour
    throw new Error('Rate limit exceeded');
  }
  
  await client.set(key, parseInt(count) + 1, 3600);
}
```

### Command Blacklist/Whitelist

```typescript
// Whitelist allowed commands per user
const allowedCommands = {
  'read-user': ['GET', 'KEYS', 'EXISTS'],
  'write-user': ['GET', 'SET', 'DEL'],
  'admin': ['*'], // All commands
};

function authorizeCommand(userRole, command) {
  const allowed = allowedCommands[userRole];
  return allowed.includes(command) || allowed.includes('*');
}
```

---

## 🔄 Replication Security

### Replication Authentication

```typescript
// Master configuration
const master = new SnailDBServer({
  port: 12222,
  replication: {
    enabled: true,
    role: 'master',
    replicationPassword: 'secure-replication-key',
  },
});

// Slave configuration
const slave = new SnailDBServer({
  port: 12223,
  replication: {
    enabled: true,
    role: 'slave',
    masterHost: 'master.internal',
    masterPort: 12222,
    masterPassword: 'secure-replication-key',
  },
});
```

---

## 📋 Security Checklist

### Development
- [ ] Use strong passwords
- [ ] Never commit .env files
- [ ] Enable error logging
- [ ] Test error messages don't leak info
- [ ] Use HTTPS in examples

### Staging
- [ ] Enable authentication
- [ ] Use TLS/SSL (reverse proxy)
- [ ] Set network policies
- [ ] Regular backup testing
- [ ] Security audit of code

### Production
- [ ] Strong, unique password
- [ ] TLS/SSL enforced
- [ ] Network isolation (VPC/private network)
- [ ] Automated backups
- [ ] Backup encryption
- [ ] Monitoring & alerting
- [ ] Regular security updates
- [ ] Incident response plan
- [ ] Data retention policy
- [ ] Audit logging

### Ongoing
- [ ] Monitor logs for suspicious activity
- [ ] Update dependencies monthly
- [ ] Rotate passwords quarterly
- [ ] Review access logs
- [ ] Test disaster recovery
- [ ] Security training for team

---

## 🚨 Incident Response

### Detection

```bash
# Monitor for suspicious patterns
tail -f data/snaildb.log | grep "ERROR\|WARN"

# Check for unusual connection patterns
netstat -an | grep 12222 | wc -l
```

### Response

```bash
# Step 1: Isolate the server
iptables -A INPUT -p tcp --dport 12222 -j DROP

# Step 2: Backup data for forensics
cp -r data data.backup-forensics

# Step 3: Review logs
grep -E "ATTACK|SCAN|FAIL" data/snaildb.log

# Step 4: Restore from clean backup
rm -rf data
cp -r data.backup-clean data

# Step 5: Verify integrity
npm run dev  # Check startup logs
```

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security@snaildb.io with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. Allow 48 hours for acknowledgment
4. Coordinate responsible disclosure

---

**Remember**: Security is an ongoing process, not a one-time setup!
