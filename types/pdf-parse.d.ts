declare module 'pdf-parse' {
  type PdfParseResult = {
    text: string
    numpages?: number
    info?: any
    metadata?: any
    version?: string
  }
  function pdfParse(input: Buffer | Uint8Array | ArrayBuffer): Promise<PdfParseResult>
  export default pdfParse
}


