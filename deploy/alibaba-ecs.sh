#!/usr/bin/env bash
# Deploy Compliance Autopilot on an Alibaba Cloud ECS instance (Ubuntu 22.04/24.04).
#
# Usage (run ON the ECS instance as root or a sudo user):
#   export DASHSCOPE_API_KEY=sk-...   # your Qwen Cloud / Model Studio key
#   curl -fsSL https://raw.githubusercontent.com/adetorojeremiahfadesayo/Compliance-AI-Scanner/main/deploy/alibaba-ecs.sh | bash
#
# Or after cloning:
#   DASHSCOPE_API_KEY=sk-... bash deploy/alibaba-ecs.sh
#
# The script is idempotent: re-running updates the code and restarts services.

set -euo pipefail

REPO_URL="https://github.com/adetorojeremiahfadesayo/Compliance-AI-Scanner.git"
APP_DIR="${APP_DIR:-/opt/compliance-autopilot}"

if [ -z "${DASHSCOPE_API_KEY:-}" ]; then
  echo "ERROR: DASHSCOPE_API_KEY is not set." >&2
  echo "Run:  export DASHSCOPE_API_KEY=sk-...  and try again." >&2
  exit 1
fi

echo "==> Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/ubuntu/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get update && apt-get install -y docker-compose-plugin
fi

echo "==> Fetching application code"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "==> Writing environment file"
cat > .env <<ENV
DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
ALIBABA_DEPLOYMENT_PROVIDER=Alibaba Cloud ECS
ENV
chmod 600 .env

echo "==> Building and starting services"
docker compose up -d --build

echo "==> Waiting for backend health"
for i in $(seq 1 30); do
  if curl -fsS http://localhost:8000/api/deployment-proof >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

PUBLIC_IP=$(curl -fsS --max-time 5 http://100.100.100.200/latest/meta-data/eipv4 2>/dev/null \
  || curl -fsS --max-time 5 http://100.100.100.200/latest/meta-data/public-ipv4 2>/dev/null \
  || echo "<your-ecs-public-ip>")

echo ""
echo "=========================================================="
echo " Deployment complete."
echo "   App:              http://${PUBLIC_IP}/"
echo "   API docs:         http://${PUBLIC_IP}:8000/docs"
echo "   Deployment proof: http://${PUBLIC_IP}:8000/api/deployment-proof"
echo ""
echo " Judges' proof endpoint response:"
curl -fsS http://localhost:8000/api/deployment-proof || true
echo ""
echo "=========================================================="
