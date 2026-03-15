import type {
  CreateNavResponse,
  DatabaseInfo,
  DatabaseListResponse,
  ImportResponse,
  NavInfo,
  NavListResponse,
  NoteInfo,
  NoteListResponse,
  SuccessResponse,
} from "./types.js"

export type HulunoteClientConfig = {
  serverUrl: string
  token: string
}

/** HTTP client for the Hulunote API */
export class HulunoteClient {
  private serverUrl: string
  private token: string

  constructor(config: HulunoteClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/+$/, "")
    this.token = config.token
  }

  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.serverUrl}${endpoint}`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const status = response.status
      if (status === 401) throw new Error("Authentication failed: invalid or expired token.")
      if (status === 403) throw new Error("Access denied.")
      if (status === 404) throw new Error("Resource not found.")
      throw new Error(`Hulunote API error (${status}): ${await response.text()}`)
    }

    return (await response.json()) as T
  }

  /** Get all databases for the authenticated user */
  async getDatabaseList(): Promise<DatabaseInfo[]> {
    const response = await this.post<DatabaseListResponse>("/hulunote/get-database-list", {})
    return response["database-list"] ?? []
  }

  /** Create a new database */
  async createDatabase(name: string, description?: string): Promise<DatabaseInfo> {
    const response = await this.post<{ database: DatabaseInfo }>("/hulunote/create-database", {
      "database-name": name,
      ...(description ? { description } : {}),
    })
    return response.database
  }

  /** Delete a database */
  async deleteDatabase(databaseId: string): Promise<void> {
    await this.post<SuccessResponse>("/hulunote/delete-database", {
      "database-id": databaseId,
    })
  }

  /** Get paginated note list for a database */
  async getNoteList(
    databaseId: string,
    page?: number,
    size?: number,
  ): Promise<{ notes: NoteInfo[]; allPages: number }> {
    const response = await this.post<NoteListResponse>("/hulunote/get-note-list", {
      "database-id": databaseId,
      ...(page != null ? { page } : {}),
      ...(size != null ? { size } : {}),
    })
    return {
      notes: response["note-list"] ?? [],
      allPages: response["all-pages"] ?? 1,
    }
  }

  /** Get all notes in a database */
  async getAllNotes(databaseId: string): Promise<NoteInfo[]> {
    const response = await this.post<NoteListResponse>("/hulunote/get-all-note-list", {
      "database-id": databaseId,
    })
    return response["note-list"] ?? []
  }

  /** Create a new note */
  async createNote(databaseId: string, title: string): Promise<NoteInfo> {
    return await this.post<NoteInfo>("/hulunote/new-note", {
      "database-id": databaseId,
      title,
    })
  }

  /** Update note title */
  async updateNoteTitle(noteId: string, title: string): Promise<void> {
    await this.post<SuccessResponse>("/hulunote/update-hulunote-note", {
      "note-id": noteId,
      title,
    })
  }

  /** Delete a note (soft delete) */
  async deleteNote(noteId: string): Promise<void> {
    await this.post<SuccessResponse>("/hulunote/update-hulunote-note", {
      "note-id": noteId,
      "is-delete": true,
    })
  }

  /** Toggle note shortcut */
  async toggleShortcut(noteId: string, isShortcut: boolean): Promise<void> {
    await this.post<SuccessResponse>("/hulunote/update-hulunote-note", {
      "note-id": noteId,
      "is-shortcut": isShortcut,
    })
  }

  /** Get shortcut notes in a database */
  async getShortcuts(databaseId: string): Promise<NoteInfo[]> {
    const response = await this.post<NoteListResponse>("/hulunote/get-shortcuts-note-list", {
      "database-id": databaseId,
    })
    return response["note-list"] ?? []
  }

  /** Get all outline nodes for a note */
  async getNoteNavs(noteId: string): Promise<NavInfo[]> {
    const response = await this.post<NavListResponse>("/hulunote/get-note-navs", {
      "note-id": noteId,
    })
    return response["nav-list"] ?? []
  }

  /** Create a new outline node */
  async createNav(
    noteId: string,
    navId: string,
    parentId: string,
    content: string,
    order: number,
  ): Promise<string> {
    const response = await this.post<CreateNavResponse>("/hulunote/create-or-update-nav", {
      "note-id": noteId,
      id: navId,
      parid: parentId,
      content,
      order,
    })
    return response.id
  }

  /** Update outline node content */
  async updateNavContent(noteId: string, navId: string, content: string): Promise<void> {
    await this.post<CreateNavResponse>("/hulunote/create-or-update-nav", {
      "note-id": noteId,
      id: navId,
      content,
    })
  }

  /** Update outline node parent (for indent/outdent) */
  async updateNavParent(
    noteId: string,
    navId: string,
    newParentId: string,
    newOrder: number,
  ): Promise<void> {
    await this.post<CreateNavResponse>("/hulunote/create-or-update-nav", {
      "note-id": noteId,
      id: navId,
      parid: newParentId,
      order: newOrder,
    })
  }

  /** Delete an outline node (soft delete) */
  async deleteNav(noteId: string, navId: string): Promise<void> {
    await this.post<CreateNavResponse>("/hulunote/create-or-update-nav", {
      "note-id": noteId,
      id: navId,
      "is-delete": true,
    })
  }

  /** Update database properties */
  async updateDatabase(
    databaseId: string,
    options: { name?: string; isPublic?: boolean; isDefault?: boolean },
  ): Promise<void> {
    await this.post<SuccessResponse>("/hulunote/update-database", {
      "database-id": databaseId,
      ...(options.name != null ? { "db-name": options.name } : {}),
      ...(options.isPublic != null ? { "is-public": options.isPublic } : {}),
      ...(options.isDefault != null ? { "is-default": options.isDefault } : {}),
    })
  }

  /** Get all navs paginated (for sync) */
  async getAllNavsByPage(
    databaseId: string,
    options?: { backendTs?: number; page?: number; size?: number },
  ): Promise<{ navs: NavInfo[]; allPages: number; backendTs: number }> {
    const response = await this.post<NavListResponse & { "all-pages"?: number }>(
      "/hulunote/get-all-nav-by-page",
      {
        "database-id": databaseId,
        ...(options?.backendTs != null ? { "backend-ts": options.backendTs } : {}),
        ...(options?.page != null ? { page: options.page } : {}),
        ...(options?.size != null ? { size: options.size } : {}),
      },
    )
    return {
      navs: response["nav-list"] ?? [],
      allPages: response["all-pages"] ?? 1,
      backendTs: response["backend-ts"] ?? 0,
    }
  }

  /** Get all navs in a database */
  async getAllNavs(
    databaseId: string,
    backendTs?: number,
  ): Promise<{ navs: NavInfo[]; backendTs: number }> {
    const response = await this.post<NavListResponse>("/hulunote/get-all-navs", {
      "database-id": databaseId,
      ...(backendTs != null ? { "backend-ts": backendTs } : {}),
    })
    return {
      navs: response["nav-list"] ?? [],
      backendTs: response["backend-ts"] ?? 0,
    }
  }

  /** Import notes from JSON content */
  async importNotes(databaseId: string, jsonContent: string, filename: string): Promise<ImportResponse> {
    const url = `${this.serverUrl}/hulunote/import-notes`
    const formData = new FormData()
    formData.append("database-id", databaseId)
    const blob = new Blob([jsonContent], { type: "application/json" })
    formData.append("file", blob, filename)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const status = response.status
      if (status === 401) throw new Error("Authentication failed: invalid or expired token.")
      if (status === 403) throw new Error("Access denied.")
      if (status === 404) throw new Error("Resource not found.")
      throw new Error(`Hulunote API error (${status}): ${await response.text()}`)
    }

    return (await response.json()) as ImportResponse
  }
}
