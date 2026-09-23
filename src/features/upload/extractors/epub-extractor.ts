import type Section from 'epubjs/types/section'
import type { ContentExtractor, IngestedContent } from '../../../types'

function titleFromFilename(filename: string): string {
  return filename.replace(/\.epub$/i, '').replace(/[-_]+/g, ' ').trim()
}

export class EpubExtractor implements ContentExtractor {
  canHandle(input: string | File): boolean {
    return (
      input instanceof File &&
      input.name.toLowerCase().endsWith('.epub')
    )
  }

  async extract(input: string | File): Promise<IngestedContent> {
    // epubjs is only fetched once an .epub is actually uploaded, not in the main bundle.
    const { default: ePub } = await import('epubjs')
    const file = input as File

    try {
      const arrayBuffer = await file.arrayBuffer()
      const book = ePub(arrayBuffer)
      await book.ready

      const metadata = await book.loaded.metadata
      const title = metadata.title?.trim() || titleFromFilename(file.name)

      const sections: Section[] = []
      book.spine.each((section: Section) => {
        sections.push(section)
      })

      const sectionTexts: string[] = []
      for (const section of sections) {
        // epubjs's types claim a Document but actually return an Element at runtime, so use querySelector instead of .body (works on both).
        const doc = (await section.load(book.load.bind(book))) as unknown as Element
        const body = doc.querySelector?.('body')
        sectionTexts.push(body?.textContent?.trim() ?? '')
        section.unload()
      }

      const rawText = sectionTexts.filter(Boolean).join('\n\n')

      return {
        title,
        rawText,
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        sourceType: 'epub',
      }
    } catch (err) {
      console.error('EPUB extraction failed:', err)
      throw new Error("Couldn't read this EPUB. It may be corrupted or not a real EPUB file.")
    }
  }
}
