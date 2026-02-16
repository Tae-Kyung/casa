'use client'

import { marked } from 'marked'

function markdownToStyledHtml(title: string, markdown: string): string {
  const bodyHtml = marked.parse(markdown, { async: false }) as string

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 25mm;
  }
  @media print {
    body { margin: 0; padding: 0; }
  }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
    font-size: 11pt;
    line-height: 1.8;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 20mm 25mm;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #111;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 10px;
    margin-top: 0;
    margin-bottom: 24px;
  }
  h2 {
    font-size: 16pt;
    font-weight: 700;
    color: #1e40af;
    margin-top: 32px;
    margin-bottom: 12px;
    border-bottom: 1px solid #dbeafe;
    padding-bottom: 6px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 13pt;
    font-weight: 600;
    color: #1e3a5f;
    margin-top: 24px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  p {
    margin: 8px 0;
    text-align: justify;
  }
  ul, ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  li {
    margin: 4px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background-color: #f3f4f6;
    font-weight: 600;
  }
  tr:nth-child(even) {
    background-color: #f9fafb;
  }
  blockquote {
    border-left: 4px solid #2563eb;
    margin: 16px 0;
    padding: 8px 16px;
    background: #eff6ff;
    color: #1e40af;
  }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10pt;
  }
  pre {
    background: #f3f4f6;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  pre code {
    background: none;
    padding: 0;
  }
  strong {
    font-weight: 700;
  }
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 24px 0;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

export function exportToPdf(title: string, markdown: string): void {
  const html = markdownToStyledHtml(title, markdown)

  // 새 창에서 열고 인쇄 다이얼로그 표시 (PDF로 저장 선택)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    // 팝업 차단 시 Blob URL 폴백
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  // 폰트 로딩 대기 후 인쇄
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }
}

export function exportToDocx(title: string, markdown: string): void {
  const bodyHtml = marked.parse(markdown, { async: false }) as string

  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
    font-size: 11pt;
    line-height: 1.8;
    color: #1a1a1a;
  }
  h1 {
    font-size: 22pt;
    font-weight: bold;
    color: #111;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 8px;
  }
  h2 {
    font-size: 16pt;
    font-weight: bold;
    color: #1e40af;
    border-bottom: 1px solid #dbeafe;
    padding-bottom: 4px;
    margin-top: 24px;
  }
  h3 {
    font-size: 13pt;
    font-weight: bold;
    color: #1e3a5f;
    margin-top: 18px;
  }
  p { margin: 6px 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 6px 10px;
  }
  th {
    background-color: #f3f4f6;
    font-weight: bold;
  }
  blockquote {
    border-left: 4px solid #2563eb;
    padding: 6px 12px;
    margin: 12px 0;
    background: #eff6ff;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`

  const blob = new Blob(['\ufeff' + docHtml], {
    type: 'application/msword',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
