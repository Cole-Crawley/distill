import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { ContentExtractor, IngestedContent } from '../../../types'

function titleFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim()
}

export class PdfExtractor implements ContentExtractor {
  canHandle(input: string | File): boolean {
    return input instanceof File && input.type === 'application/pdf'
  }

  async extract(input: string | File): Promise<IngestedContent> {
    // pdfjs-dist is one of the largest deps in the project, so it's only
    // fetched once a PDF is actually uploaded rather than in the main bundle.
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

    const file = input as File

    // pdfjs throws its own internal exceptions (e.g. "Invalid PDF structure.") for a corrupted
    // or password-protected file — developer-facing text, same class of bug as the raw Anthropic
    // SDK error previously shown verbatim for AI failures (see the dissertation, Appendix A,
    // finding AI-1). Caught live: uploading a garbage-bytes .pdf surfaced "Invalid PDF structure."
    // straight from the library with no explanation or next step.
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      const pageTexts: string[] = []
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const content = await page.getTextContent()
        const pageText = content.items
          .map(item => ('str' in item ? item.str : ''))
          .join(' ')
        pageTexts.push(pageText)
      }

      const rawText = pageTexts.join('\n')

      return {
        title: titleFromFilename(file.name),
        rawText,
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        sourceType: 'pdf',
      }
    } catch {
      throw new Error("Couldn't read this PDF. It may be corrupted or password-protected.")
    }
  }
}
