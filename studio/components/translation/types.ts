export interface TranslationRef {
  value?: {_ref?: string}
  [key: string]: unknown
}

export interface MetadataDoc {
  _id: string
  _createdAt?: string
  translations: TranslationRef[]
}
