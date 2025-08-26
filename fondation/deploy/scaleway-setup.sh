#!/bin/bash
# Scaleway Instance Setup Script for Fondation Worker
# Run this on a fresh Scaleway Instance (Ubuntu 22.04)

set -e

echo "🚀 Setting up Scaleway Instance for Fondation Worker"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
echo "🎼 Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin

# Install essential tools
echo "🔧 Installing essential tools..."
sudo apt-get install -y git curl wget htop ncdu

# Create working directory
echo "📁 Creating working directory..."
sudo mkdir -p /srv/fondation
sudo chown $USER:$USER /srv/fondation
cd /srv/fondation

# Create environment file
echo "📝 Creating environment template..."
cat > .env.example << 'EOF'
# Fondation Worker Configuration
NODE_ENV=production
CONVEX_URL=https://your-deployment.convex.cloud
WORKER_ID=scaleway-worker-1
POLL_INTERVAL=5000
LEASE_TIME=300000
HEARTBEAT_INTERVAL=60000
MAX_CONCURRENT_JOBS=1
TEMP_DIR=/tmp/fondation
EOF

echo "⚠️  Copy .env.example to .env and add your configuration"

# Create docker-compose.prod.yml
echo "🐳 Creating production Docker Compose file..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  worker:
    image: fondation-worker:latest
    restart: unless-stopped
    env_file: .env
    volumes:
      - /srv/claude-creds:/home/worker/.claude:ro
      - worker-tmp:/tmp/fondation
    ports:
      - "127.0.0.1:8080:8080"  # Health check - localhost only
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'

volumes:
  worker-tmp:
    driver: local
EOF

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/fondation-worker.service > /dev/null << 'EOF'
[Unit]
Description=Fondation Worker
Requires=docker.service
After=docker.service

[Service]
Type=simple
Restart=unless-stopped
RestartSec=10
WorkingDirectory=/srv/fondation
ExecStartPre=/usr/bin/docker-compose -f docker-compose.prod.yml pull
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

# Create update script
echo "🔄 Creating update script..."
cat > update-worker.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Updating Fondation Worker..."

# Pull latest image
docker pull fondation-worker:latest

# Restart service
sudo systemctl restart fondation-worker

# Check status
sudo systemctl status fondation-worker --no-pager

echo "✅ Update complete"
EOF
chmod +x update-worker.sh

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash

echo "📊 Fondation Worker Status"
echo "=========================="
echo ""

# Service status
echo "🔄 Service Status:"
sudo systemctl status fondation-worker --no-pager | head -10
echo ""

# Container status
echo "🐳 Container Status:"
docker ps --filter "name=worker"
echo ""

# Health check
echo "🏥 Health Check:"
curl -s http://localhost:8080/health | jq . 2>/dev/null || echo "Health endpoint not responding"
echo ""

# Logs (last 20 lines)
echo "📜 Recent Logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20
echo ""

# Disk usage
echo "💾 Disk Usage:"
df -h /
echo ""

# Memory usage
echo "🧠 Memory Usage:"
free -h
EOF
chmod +x monitor.sh

# Create Claude auth script
echo "🔐 Creating Claude authentication helper..."
cat > auth-claude.sh << 'EOF'
#!/bin/bash
set -e

echo "🔐 Authenticating Claude CLI"
echo "============================"
echo ""
echo "This will start an interactive session to authenticate with Claude."
echo "Follow the prompts to complete authentication."
echo ""

# Create credentials directory
sudo mkdir -p /srv/claude-creds
sudo chown $USER:$USER /srv/claude-creds

# Run interactive authentication
docker run -it \
  -v /srv/claude-creds:/home/worker/.claude \
  fondation-worker:latest \
  /bin/sh -c "claude login"

echo ""
echo "✅ Authentication complete. Credentials saved to /srv/claude-creds"
echo "   These will be mounted read-only to the worker container."
EOF
chmod +x auth-claude.sh

# Create backup script
echo "💾 Creating backup script..."
cat > backup-creds.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/srv/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/claude-creds-${TIMESTAMP}.tar.gz"

echo "💾 Backing up Claude credentials..."

# Create backup directory
sudo mkdir -p ${BACKUP_DIR}

# Create backup
sudo tar -czf ${BACKUP_FILE} -C /srv claude-creds

echo "✅ Backup saved to: ${BACKUP_FILE}"

# Keep only last 5 backups
ls -t ${BACKUP_DIR}/claude-creds-*.tar.gz | tail -n +6 | xargs -r rm

echo "📋 Current backups:"
ls -lh ${BACKUP_DIR}/claude-creds-*.tar.gz
EOF
chmod +x backup-creds.sh

# Create log rotation config
echo "📜 Setting up log rotation..."
sudo tee /etc/logrotate.d/fondation-worker > /dev/null << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
    maxsize 100M
}
EOF

echo ""
echo "✅ Scaleway Instance setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your worker Docker image to this server or build it here"
echo "2. Configure environment variables: cp .env.example .env && nano .env"
echo "3. Authenticate Claude CLI: ./auth-claude.sh"
echo "4. Enable and start the service:"
echo "   sudo systemctl enable fondation-worker"
echo "   sudo systemctl start fondation-worker"
echo "5. Check status: ./monitor.sh"
echo ""
echo "📁 Files created in /srv/fondation:"
echo "   - docker-compose.prod.yml (Docker Compose configuration)"
echo "   - .env.example (Environment template)"
echo "   - update-worker.sh (Update script)"
echo "   - monitor.sh (Monitoring script)"
echo "   - auth-claude.sh (Claude authentication)"
echo "   - backup-creds.sh (Credential backup)"
echo ""
echo "⚙️  Systemd service: fondation-worker"
echo "   sudo systemctl status fondation-worker"
echo "   sudo journalctl -u fondation-worker -f"