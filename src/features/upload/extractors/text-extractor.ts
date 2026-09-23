import type { ContentExtractor, IngestedContent } from '../../../types'

function titleFromText(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 8)
  return words.join(' ') + (text.trim().split(/\s+/).length > 8 ? '…' : '')
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.txt$/i, '').replace(/[-_]+/g, ' ').trim()
}

export class TextExtractor implements ContentExtractor {
  canHandle(input: string | File): boolean {
    return typeof input === 'string' || input.name.toLowerCase().endsWith('.txt')
  }

  async extract(input: string | File): Promise<IngestedContent> {
    const isFile = input instanceof File
    const rawText = (isFile ? await input.text() : input).trim()

    return {
      title: isFile ? titleFromFilename(input.name) : titleFromText(rawText),
      rawText,
      wordCount: rawText.split(/\s+/).filter(Boolean).length,
      sourceType: 'text',
    }
  }
}
