# Security: Secret Rotation Checklist

The previously shared Privy app secret is compromised and must be rotated before deployment.

## Rotate Privy Secret
1. Open Privy dashboard.
2. Rotate app secret for app ID.
3. Update:
- `PRIVY_APP_SECRET` in Vercel production env.
- `PRIVY_APP_SECRET` in local `.env.local`.
4. Redeploy `main` and `develop`.

## Validate Exposure Controls
1. Confirm no server secrets in `NEXT_PUBLIC_*`.
2. Confirm `.env.local` is gitignored.
3. Confirm API routes requiring admin token reject missing/invalid token.

## Ongoing Practices
1. Rotate high-value credentials every 30 days.
2. Keep one incident contact and rollback runbook.
3. Log and alert on repeated blocked anti-sybil events.

