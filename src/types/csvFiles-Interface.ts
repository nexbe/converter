export interface CsvFile {

  data: any[]
  errorMessage: string | null
  hasInvalidDate?: boolean | null
  fileName: string
  header: string
}
