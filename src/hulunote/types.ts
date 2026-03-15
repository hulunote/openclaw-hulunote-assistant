/** Account info from login response */
export type AccountInfo = {
  "accounts/id": number
  "accounts/username": string
  "accounts/nickname"?: string
  "accounts/mail"?: string
  "accounts/invitation-code"?: string
  "accounts/is-new-user"?: boolean
  "accounts/created-at"?: string
  "accounts/updated-at"?: string
}

/** Login response */
export type LoginResponse = {
  token: string
  hulunote: AccountInfo
  database?: string
}

/** Database info */
export type DatabaseInfo = {
  "hulunote-databases/id": string
  "hulunote-databases/name": string
  "hulunote-databases/description"?: string
  "hulunote-databases/is-delete"?: boolean
  "hulunote-databases/is-public"?: boolean
  "hulunote-databases/is-default"?: boolean
  "hulunote-databases/account-id": number
  "hulunote-databases/created-at"?: string
  "hulunote-databases/updated-at"?: string
}

/** Database list response */
export type DatabaseListResponse = {
  "database-list": DatabaseInfo[]
}

/** Note info */
export type NoteInfo = {
  "hulunote-notes/id": string
  "hulunote-notes/title": string
  "hulunote-notes/database-id": string
  "hulunote-notes/root-nav-id": string
  "hulunote-notes/is-delete"?: boolean
  "hulunote-notes/is-public"?: boolean
  "hulunote-notes/is-shortcut"?: boolean
  "hulunote-notes/account-id": number
  "hulunote-notes/pv"?: number
  "hulunote-notes/created-at"?: string
  "hulunote-notes/updated-at"?: string
}

/** Note list response */
export type NoteListResponse = {
  "note-list": NoteInfo[]
  "all-pages"?: number
}

/** Nav (outline node) info */
export type NavInfo = {
  id: string
  parid: string
  "same-deep-order": number
  content: string
  "account-id": number
  "note-id": string
  "database-id": string
  "is-display"?: boolean
  "is-public"?: boolean
  "is-delete"?: boolean
  properties: string
  "created-at"?: string
  "updated-at"?: string
}

/** Nav list response */
export type NavListResponse = {
  "nav-list": NavInfo[]
  "backend-ts"?: number
}

/** Create/update nav response */
export type CreateNavResponse = {
  success: boolean
  id: string
  "backend-ts"?: number
}

/** Generic success response */
export type SuccessResponse = {
  success: boolean
  message?: string
}

/** Import notes response */
export type ImportResponse = {
  success: boolean
  "imported-count": number
  "error-count": number
  imported: Array<{
    file: string
    "note-id": string
    title: string
    "nav-count": number
  }>
  errors: Array<{
    file: string
    error: string
  }>
}

/** Flattened outline node for display */
export type OutlineNode = {
  id: string
  parentId: string
  content: string
  depth: number
  order: number
  children: OutlineNode[]
}
