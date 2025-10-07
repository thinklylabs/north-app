declare module 'pdfjs-dist' {
  export function getDocument(params: { data: Uint8Array }): { promise: Promise<PdfDocument> }
  export interface PdfDocument {
    numPages: number
    getPage(pageNumber: number): Promise<PdfPage>
  }
  export interface PdfPage {
    getTextContent(): Promise<{ items: Array<{ str?: string }> }>
  }
}

declare module 'pdfjs-dist/build/pdf.js' {
  export const GlobalWorkerOptions: { workerSrc?: string }
  export function getDocument(params: { data: Uint8Array }): { promise: Promise<PdfDocument> }
  export interface PdfDocument {
    numPages: number
    getPage(pageNumber: number): Promise<PdfPage>
  }
  export interface PdfPage {
    getTextContent(): Promise<{ items: Array<{ str?: string }> }>
  }
}


