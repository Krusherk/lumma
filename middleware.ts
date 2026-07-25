/**
 * Vercel Edge Middleware — serves article-specific OG meta tags
 * to social media crawlers for rich link previews.
 *
 * Regular users get the SPA as normal.
 */

const BOT_UA = /twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|googlebot|bingbot|embedly|quora|pinterest|vkshare/i

interface ArticleMeta {
  title: string
  description: string
  image: string
  category: string
  date: string
}

const ARTICLES: Record<string, ArticleMeta> = {
  'stablecoin-payroll-for-global-teams': {
    title: 'Stablecoin Payroll for Global Teams — What It Is and Why It Matters',
    description: 'Paying contractors across borders is broken. Wire fees, bank rejections, inflation losses, and weeks of waiting. Agent Payroll fixes this with USDC.',
    image: '/images/payroll.jpg',
    category: 'Product',
    date: 'May 26, 2025',
  },
  'lumma-integrates-lifi-crosschain-routing': {
    title: 'Lumma now supports cross-chain routing through LI.FI',
    description: 'We replaced our custom bridge infrastructure with LI.FI\'s routing engine. Users can now swap and bridge assets from 60+ chains.',
    image: '/images/lummaxlifi.PNG',
    category: 'Engineering',
    date: 'May 11, 2025',
  },
}

export const config = {
  matcher: ['/((?!api|_next|images|assets|favicon|.*\\.).*)'],
}

export default function middleware(request: Request) {
  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') || ''
  const slug = url.pathname.replace(/^\/+/, '')

  // Only intercept for bots visiting article URLs
  if (!BOT_UA.test(ua) || !ARTICLES[slug]) {
    return undefined // pass through to SPA
  }

  const article = ARTICLES[slug]
  const origin = url.origin
  const fullImage = article.image.startsWith('http') ? article.image : `${origin}${article.image}`
  const fullUrl = `${origin}/${slug}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${article.title} — Lumma Blog</title>
  <meta name="description" content="${article.description}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Lumma Blog" />
  <meta property="og:title" content="${article.title}" />
  <meta property="og:description" content="${article.description}" />
  <meta property="og:image" content="${fullImage}" />
  <meta property="og:url" content="${fullUrl}" />
  <meta property="article:published_time" content="${article.date}" />
  <meta property="article:section" content="${article.category}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@lummaxyz" />
  <meta name="twitter:title" content="${article.title}" />
  <meta name="twitter:description" content="${article.description}" />
  <meta name="twitter:image" content="${fullImage}" />
  <link rel="canonical" href="${fullUrl}" />
</head>
<body>
  <p>${article.description}</p>
  <a href="${fullUrl}">Read on Lumma Blog</a>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
