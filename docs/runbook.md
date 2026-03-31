# Private Deployment Runbook

## Local validation

1. Start backend from `backend/`
2. Start frontend from `frontend/`
3. Open the app and execute several sample trades
4. Confirm:
   - WebSocket feed updates every second
   - Pre-trade estimate works
   - Execution quality and cost attribution panels populate
   - Leaderboard registration and trade recording work

## Private GitHub checklist

1. Create a private repository only
2. Add the required collaborator account
3. Enable branch protection and security scanning
4. Disable forking and public discussions
5. Store production secrets in GitHub Actions secrets

## Production notes

- Replace sqlite with PostgreSQL using the shipped schema
- Add Redis for leaderboard and order book caching
- Place backend behind a private API gateway or VPN-protected ingress
- Restrict frontend distribution to private infrastructure
