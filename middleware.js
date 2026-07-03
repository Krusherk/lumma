/**
 * Vercel Edge Middleware — serves article-specific OG meta tags
 * to social media crawlers for rich link previews.
 */

const BOT_UA = /twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|googlebot|bingbot|embedly|quora|pinterest|vkshare/i

const ARTICLES = {
  'stablecoin-payroll-for-global-teams': {
    title: 'Stablecoin Payroll for Global Teams and Agent Economies',
    description: 'Stablecoin payroll is not just about paying remote teams faster. It is the foundation for how internet-native workers, global contributors, and AI agents can settle work in real time.',
    image: '/images/payroll.jpg',
  },
  'lumma-integrates-lifi-crosschain-routing': {
    title: 'Lumma now supports cross-chain routing through LI.FI',
    description: 'We replaced our custom bridge infrastructure with LI.FI routing engine. Users can now swap and bridge assets from 60+ chains.',
    image: '/images/lummaxlifi.PNG',
  },
}

export const config = {
  matcher: ['/((?!api|_next|images|assets|favicon|.*\\.).*)'],
}

export default function middleware(request) {
  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') || ''
  const slug = url.pathname.replace(/^\/+/, '')

  if (!BOT_UA.test(ua) || !ARTICLES[slug]) {
    return undefined
  }

  const article = ARTICLES[slug]
  const origin = url.origin
  const fullImage = article.image.startsWith('http') ? article.image : origin + article.image
  const fullUrl = origin + '/' + slug

  const html = '<!DOCTYPE html><html><head>' +
    '<meta charset="UTF-8" />' +
    '<title>' + article.title + ' — Lumma Blog</title>' +
    '<meta name="description" content="' + article.description + '" />' +
    '<meta property="og:type" content="article" />' +
    '<meta property="og:site_name" content="Lumma Blog" />' +
    '<meta property="og:title" content="' + article.title + '" />' +
    '<meta property="og:description" content="' + article.description + '" />' +
    '<meta property="og:image" content="' + fullImage + '" />' +
    '<meta property="og:url" content="' + fullUrl + '" />' +
    '<meta name="twitter:card" content="summary_large_image" />' +
    '<meta name="twitter:site" content="@lummaxyz" />' +
    '<meta name="twitter:title" content="' + article.title + '" />' +
    '<meta name="twitter:description" content="' + article.description + '" />' +
    '<meta name="twitter:image" content="' + fullImage + '" />' +
    '</head><body><p>' + article.description + '</p></body></html>'

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
