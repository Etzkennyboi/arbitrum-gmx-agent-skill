# Deployment Guide — Railway

Deploy `arbitrum-gmx-agent-skill` to Railway in **5 minutes**.

## Prerequisites

- ✅ GitHub account (for repo)
- ✅ Railway account ([railway.app](https://railway.app) — free tier available)
- ✅ Arbitrum wallet with test ETH (Sepolia) + USDC (One)
- ✅ Private key from your wallet (Arbitrum One)

## Step 1: Push to GitHub

```bash
cd arbitrum-gmx-agent-skill

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: arbitrum-gmx-agent-skill"

# Create new repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/arbitrum-gmx-agent-skill.git
git branch -M main
git push -u origin main
```

## Step 2: Connect to Railway

### Option A: Web UI (Easiest)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select your `arbitrum-gmx-agent-skill` repository
4. Confirm & deploy (Railway auto-detects Node.js)

### Option B: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init  # Follow prompts, select GitHub repo
railway up    # Deploy
```

## Step 3: Set Environment Variables

In Railway dashboard → Your Project → Variables:

```env
AGENT_WALLET_PRIVATE_KEY=0x...your_private_key...
PORT=3000
ARBITRUM_ONE_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
```

⚠️ **Never commit `.env` to git** — only set via Railway dashboard

## Step 4: Register Agent (Get AGENT_ID)

Once deployed, SSH into Railway and run:

```bash
railway shell
npm run register
# Output: AGENT_ID=1 (copy this)
```

Add to Railway variables:
```env
AGENT_ID=1
AGENT_ENDPOINT=https://your-app.railway.app
```

## Step 5: Test Live Deployment

```bash
curl https://your-app.railway.app/health
# {"status": "healthy", "latestBlock": 448000000, ...}

curl https://your-app.railway.app/prices/ETH
# {"success": true, "data": {"price": 2041.55, ...}}
```

## Enabling Auto-Deploy

Railway auto-redeploys on every `git push` to main:

```bash
git add .
git commit -m "Update pricing logic"
git push origin main
# ✨ Railway auto-deploys in ~2 minutes
```

## Rollback

In Railway dashboard:

1. Go to **Deployments** tab
2. Click previous deployment → **"Revert"**

## Monitoring

Railway provides real-time logs:

```
System logs:
✅ Build started
✅ npm install completed
✅ npm start running
🚀 Server listening on port 3000

App logs:
GET /health 200 1.2ms
GET /prices/ETH 200 128ms
POST /position/long 200 2341ms
```

## Troubleshooting

### Build fails: "Module not found"

```bash
# Ensure package.json exists and is valid
npm install
git add package-lock.json
git push
```

### Deployment hangs on "npm install"

- Check **Build logs** in Railway dashboard
- May need to increase `NODE_MEMORY` environment variable
- Restart build: Dashboard → Deployments → **"Rebuild"**

### Server starts but endpoints 404

- Check deployed app is using `node agent/server.js`
- Verify `PORT=3000` is set in env vars
- Check Railway logs for startup errors

### Private key rejected

- Ensure it's the full private key (starts with `0x`)
- Verify it's for Arbitrum One (not Sepolia)
- Test locally first: `AGENT_WALLET_PRIVATE_KEY=0x... npm test`

### Price feeds return 0

- Chainlink feeds may be down
- Check [chain.link status](https://status.chain.link)
- Fallback to cached prices (implement in `lib/prices.js`)

## Performance Tips

- **Cache results**: Implement Redis for price feeds (5-min TTL)
- **Batch requests**: Use `Promise.all()` for parallel calls
- **Rate limiting**: Add Express rate-limiter middleware
- **Database**: Store historical prices in Railway PostgreSQL

## Security Checklist

- ✅ Private key in env vars (not code)
- ✅ `.env` in `.gitignore`
- ✅ HTTPS enforced (Railway default)
- ✅ CORS configured (see `agent/server.js`)
- ✅ Input validation on all endpoints
- ⚠️ Use a **dedicated wallet** (not main)
- ⚠️ Limit API access with rate limiting

## Custom Domain

In Railway dashboard → Networking:

1. Click **"Add Custom Domain"**
2. Point your domain DNS to Railway
3. SSL certificate auto-provisioned

Example:
```
DNS: CNAME gmx-agent.example.com → railway.app
Railway: Add gmx-agent.example.com as custom domain
Result: https://gmx-agent.example.com/ 🎉
```

## Scaling

As traffic grows:

| Stage | Config | Cost |
|-------|--------|------|
| Dev | `$5/mo` shared | Test only |
| Beta | `$7-15/mo` small | <10 req/s |
| Prod | `$20-50+/mo` large | 100+ req/s |

Upgrade in Railway dashboard → Plan settings

## Submitting to ArbiLink

Once live:

1. **Get your URL:** `https://your-app.railway.app`
2. **Test endpoints:**
   ```bash
   curl https://your-app.railway.app/
   curl https://your-app.railway.app/prices/ETH
   curl https://your-app.railway.app/analyze
   ```
3. **Post on X (Twitter):**
   ```
   💫 Just deployed arbitrum-gmx-agent-skill to open access 🚀
   Live: https://your-app.railway.app
   
   ✅ Read prices
   ✅ Trade GMX V2 perpetuals
   ✅ Monitor liquidation risk
   
   Built for @arbitrum agent ecosystem
   #ArbiLink #GMX #DeFi
   
   @Arbitrum @gmx_io
   ```
4. **Submit to bounty:** Link in repo + Twitter post
5. **Deadline:** April 3, 2026 19:30 CET

---

**Questions?** Check Railway docs: [docs.railway.app](https://docs.railway.app)
