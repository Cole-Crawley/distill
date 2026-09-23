import { Readability } from '@mozilla/readability'
import type { ContentExtractor, IngestedContent } from '../../../types'

// Distill has no backend, so fetching an article URL needs a CORS proxy (free tier limited to localhost/dev, which matches how this app runs).
const CORS_PROXY_URL = 'https://corsproxy.io/?url='

function friendlyFetchErrorMessage(status: number): string {
  if (status === 404) return "Couldn't find that page. Check the URL and try again."
  if (status === 429) return "That site is temporarily limiting requests. Wait a moment and try again."
  if (status >= 500) return "That site's server is having trouble right now. Try again in a bit."
  return `Couldn't fetch that page (error ${status}). Try a different URL, or paste the text directly.`
}

export class UrlExtractor implements ContentExtractor {
  canHandle(input: string | File): boolean {
    return (
      typeof input === 'string' &&
      (input.startsWith('http://') || input.startsWith('https://'))
    )
  }

  async extract(input: string | File): Promise<IngestedContent> {
    const url = input as string
    const proxyResponse = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(url)}`)
    if (!proxyResponse.ok) {
      throw new Error(friendlyFetchErrorMessage(proxyResponse.status))
    }

    const html = await proxyResponse.text()
    // Readability just needs a DOM Document, which the browser's native DOMParser gives us (no jsdom needed).
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const base = doc.createElement('base')
    base.href = url
    doc.head.prepend(base)
    const article = new Readability(doc).parse()

    if (!article) {
      throw new Error('Could not extract readable content from this URL')
    }

    const rawText = (article.textContent ?? '').trim()

    return {
      title: article.title || url,
      rawText,
      wordCount: rawText.split(/\s+/).filter(Boolean).length,
      sourceType: 'url',
      sourceUrl: url,
      metadata: {
        author: article.byline ?? undefined,
        siteName: article.siteName ?? undefined,
      },
    }
  }
}
