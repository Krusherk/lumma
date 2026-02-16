# Domain + Vercel Setup

## Targets
- `lumma.xyz`: marketing + launch page.
- `app.lumma.xyz`: production app.
- `testnet.lumma.xyz`: staging app (mapped to `develop` branch).
- `docs.lumma.xyz`: Lumma docs portal.

## DNS Records
Create these records in your domain registrar:

1. `A` record
- Host: `@`
- Value: `76.76.21.21`

2. `CNAME` record
- Host: `app`
- Value: `cname.vercel-dns.com`

3. `CNAME` record
- Host: `testnet`
- Value: `cname.vercel-dns.com`

4. `CNAME` record
- Host: `docs`
- Value: `cname.vercel-dns.com`

5. Optional wildcard
- `CNAME` host: `*`
- Value: `cname.vercel-dns.com`

## Vercel Project Configuration
1. Add domain `lumma.xyz`.
2. Add domain `app.lumma.xyz`.
3. Add domain `testnet.lumma.xyz`.
4. Add domain `docs.lumma.xyz`.
5. Set production branch to `main`.
6. Set preview branch alias for `develop` to `testnet.lumma.xyz`.
7. Add environment variables from `.env.example`.

## Routing Behavior
- Root domain can serve marketing page (`/`).
- Middleware rewrites `app.lumma.xyz/` and `testnet.lumma.xyz/` to `/app`.
- Middleware rewrites `docs.lumma.xyz/` to `/docs`.

## Verification
1. Check DNS propagation.
2. Confirm TLS certs issued in Vercel.
3. Open:
- `https://lumma.xyz`
- `https://app.lumma.xyz`
- `https://testnet.lumma.xyz`
- `https://docs.lumma.xyz`
