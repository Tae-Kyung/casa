import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'

let workerInitialized = false

function ensureWorker() {
  if (workerInitialized) return
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
  workerInitialized = true
}

export interface PdfExtractResult {
  text: string
  pageCount: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function extractTextFromPdf(file: File): Promise<PdfExtractResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('PDF_TOO_LARGE')
  }

  if (file.type !== 'application/pdf') {
    throw new Error('NOT_PDF')
  }

  ensureWorker()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }

  return {
    text: pages.join('\n\n'),
    pageCount: pdf.numPages,
  }
}
