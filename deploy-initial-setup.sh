#!/usr/bin/env bash
set -euo pipefail

echo "🚀 LightWeight! — Fly.io Deploy Script"
echo "========================================"

# 1. Check / install flyctl
if ! command -v flyctl &>/dev/null; then
  if [[ -f "$HOME/.fly/bin/flyctl" ]]; then
    export PATH="$HOME/.fly/bin:$PATH"
  else
    echo "📦 Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
  fi
fi

echo "✅ Fly CLI: $(flyctl version)"

# 2. Auth — opens browser
if ! flyctl auth whoami &>/dev/null 2>&1; then
  echo ""
  echo "🔐 You need to sign up / log in to Fly.io"
  echo "   A browser window will open..."
  flyctl auth login
fi

echo "✅ Logged in as: $(flyctl auth whoami)"

# 3. Launch app only if it doesn't already exist
APP_NAME="$(grep -E "^app = " fly.toml | head -1 | sed -E "s/app = '(.*)'/\\1/")"
echo ""
if flyctl apps list | awk '{print $1}' | grep -qx "$APP_NAME"; then
  echo "ℹ️  App '$APP_NAME' already exists. Skipping flyctl launch."
else
  echo "🛫 Creating app '$APP_NAME' on Fly.io..."
  flyctl launch --name "$APP_NAME" --no-deploy --copy-config --yes
fi

# 4. Create persistent volume for SQLite
echo ""
echo "💾 Creating persistent volume for database..."
flyctl volumes create data --region arn --size 1 --yes

# 5. Set secrets
echo ""
echo "🔑 Setting secrets..."
flyctl secrets set GOOGLE_CLIENT_ID="220091288690-ngi912gfn0ddm88dpa01p7traa7irpsg.apps.googleusercontent.com"

# 6. Deploy
echo ""
echo "🚀 Deploying..."
flyctl deploy

echo ""
echo "========================================"
echo "✅ Deploy complete!"
echo ""
flyctl status
echo ""
echo "🌐 Your app: https://$(flyctl info --name 2>/dev/null || echo 'your-app').fly.dev"
echo ""
echo "Next steps:"
echo "  • Add that URL to Google OAuth authorized origins"
echo "  • Add custom domain later: flyctl certs add yourdomain.com"
