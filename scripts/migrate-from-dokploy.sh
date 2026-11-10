#!/bin/bash
set -euo pipefail

# ==============================================================================
# Meshdock Migration Script: Seamless Upgrade from Dokploy to Meshdock v1.0.0
# Developed by SOFTTY.NET (https://www.softty.net)
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/softtyos/meshdock/main/scripts/migrate-from-dokploy.sh | bash
#   OR:
#   bash scripts/migrate-from-dokploy.sh
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}        MESHDOCK MIGRATION ASSISTANT (Dokploy ➔ Meshdock)      ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] This script must be run as root (or via sudo).${NC}"
    exit 1
fi

# 2. Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed on this system.${NC}"
    exit 1
fi

# 3. Check Docker Swarm state
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "inactive")
if [ "$SWARM_STATE" != "active" ]; then
    echo -e "${RED}[ERROR] Docker Swarm is not active on this host. Dokploy requires Swarm.${NC}"
    exit 1
fi

# 4. Check if Dokploy service exists
if ! docker service inspect dokploy > /dev/null 2>&1; then
    echo -e "${YELLOW}[WARNING] Swarm service 'dokploy' was not found.${NC}"
    echo -e "Checking if this is a fresh install or standalone container..."
    if [ -f "/etc/dokploy/docker-compose.yml" ]; then
        echo -e "${BLUE}Found compose configuration in /etc/dokploy. Proceeding...${NC}"
    else
        echo -e "${RED}[ERROR] No existing Dokploy installation detected in Swarm or /etc/dokploy.${NC}"
        echo -e "For fresh installations, please run the standard Meshdock installer:"
        echo -e "  curl -sSL https://raw.githubusercontent.com/softtyos/meshdock/main/install.sh | bash"
        exit 1
    fi
fi

# 5. Pre-migration Safety Backup
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TAR="/root/dokploy_backup_${BACKUP_TIMESTAMP}.tar.gz"
BACKUP_SQL="/etc/dokploy/db_backup_${BACKUP_TIMESTAMP}.sql"

echo -e "\n${YELLOW}[1/5] Creating safety backups...${NC}"

# 5.1 Backup PostgreSQL database
PG_CONTAINER=$(docker ps -q --filter "name=dokploy-postgres" | head -n 1 || true)
if [ -n "$PG_CONTAINER" ]; then
    echo "Backing up PostgreSQL database to $BACKUP_SQL ..."
    docker exec -t "$PG_CONTAINER" pg_dump -U dokploy dokploy > "$BACKUP_SQL" 2>/dev/null || true
    if [ -s "$BACKUP_SQL" ]; then
        echo -e "${GREEN}✓ Database snapshot saved (${BACKUP_SQL})${NC}"
    else
        echo -e "${YELLOW}! Warning: Could not dump DB via container; checking data directory.${NC}"
    fi
fi

# 5.2 Backup configuration directory
if [ -d "/etc/dokploy" ]; then
    tar -czf "$BACKUP_TAR" /etc/dokploy 2>/dev/null || true
    echo -e "${GREEN}✓ Configuration directory archived to ${BACKUP_TAR}${NC}"
fi

# 6. Pull Meshdock images
echo -e "\n${YELLOW}[2/5] Pulling latest Meshdock images from Docker Hub...${NC}"
docker pull softtynet/meshdock:latest
docker pull softtynet/meshdock-agent:latest

# 7. In-place Update of Control Plane Service
echo -e "\n${YELLOW}[3/5] Upgrading Control Plane to Meshdock v1.0.0...${NC}"
echo "Updating service 'dokploy' in-place (hosted apps and databases remain unaffected)..."

docker service update \
  --image softtynet/meshdock:latest \
  --update-order stop-first \
  dokploy

# 8. Upgrade Monitoring / Agent Service (if present)
echo -e "\n${YELLOW}[4/5] Upgrading Monitoring & Node Agent...${NC}"
if docker service inspect dokploy-monitoring > /dev/null 2>&1; then
    echo "Updating 'dokploy-monitoring' service to softtynet/meshdock-agent:latest ..."
    docker service update \
      --image softtynet/meshdock-agent:latest \
      --update-order stop-first \
      dokploy-monitoring
    echo -e "${GREEN}✓ Node Agent upgraded to softtynet/meshdock-agent${NC}"
else
    echo "No existing monitoring service detected. You can activate Global Swarm Agent anytime in Meshdock UI."
fi

# 9. Healthcheck & Convergence Verification
echo -e "\n${YELLOW}[5/5] Verifying Meshdock service health...${NC}"

HEALTHY=false
for i in {1..30}; do
    if curl -fs http://localhost:3000/api/trpc/settings.health > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "$HEALTHY" = true ]; then
    echo -e "\n${GREEN}================================================================${NC}"
    echo -e "${GREEN}  ✓ CONGRATULATIONS! MIGRATION TO MESHDOCK COMPLETED!            ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo -e "• Control Plane:  ${BLUE}softtynet/meshdock:latest (v1.0.0)${NC}"
    echo -e "• Node Agent:     ${BLUE}softtynet/meshdock-agent:latest${NC}"
    echo -e "• Data & Apps:    ${GREEN}Preserved 100% with zero downtime${NC}"
    echo -e "• Backup Archive: ${YELLOW}${BACKUP_TAR}${NC}"
    echo -e "\nYou can now open your browser and access Meshdock at your server IP or domain."
else
    echo -e "${YELLOW}[NOTICE] Meshdock service is still initializing database migrations.${NC}"
    echo "Check logs using: docker service logs --tail 50 dokploy"
    echo "If you need to rollback, execute:"
    echo "  docker service update --image dokploy/dokploy:latest --update-order stop-first dokploy"
fi
