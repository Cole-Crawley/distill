import type { ContentExtractor, IngestedContent } from '../../../types'

function titleFromFilename(filename: string): string {
  return filename.replace(/\.docx$/i, '').replace(/[-_]+/g, ' ').trim()
}

export class DocxExtractor implements ContentExtractor {
  canHandle(input: string | File): boolean {
    return (
      input instanceof File &&
      input.name.toLowerCase().endsWith('.docx')
    )
  }

  async extract(input: string | File): Promise<IngestedContent> {
    // mammoth is only fetched once a .docx is actually uploaded, not in the main bundle.
    const { default: mammoth } = await import('mammoth')
    const file = input as File

    try {
      const arrayBuffer = await file.arrayBuffer()
      const { value: rawText } = await mammoth.extractRawText({ arrayBuffer })

      return {
        title: titleFromFilename(file.name),
        rawText,
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        sourceType: 'docx',
      }
    } catch {
      throw new Error("Couldn't read this DOCX file. It may be corrupted or not a real Word document.")
    }
  }
}
