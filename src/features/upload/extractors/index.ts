import type { ContentExtractor, IngestedContent } from '../../../types'
import { PdfExtractor } from './pdf-extractor'
import { DocxExtractor } from './docx-extractor'
import { EpubExtractor } from './epub-extractor'
import { UrlExtractor } from './url-extractor'
import { TextExtractor } from './text-extractor'

// YouTube support was removed: YouTube blocks browser-only apps and even CORS proxy workarounds, so it can't work without a backend server (see project memory for the investigation).
export async function ingest(input: string | File): Promise<IngestedContent> {
  const extractors: ContentExtractor[] = [
    new PdfExtractor(),
    new DocxExtractor(),
    new EpubExtractor(),
    new UrlExtractor(),
    new TextExtractor(),
  ]
  const extractor = extractors.find(e => e.canHandle(input))
  if (!extractor) throw new Error('No extractor found for this input type')
  return extractor.extract(input)
}
