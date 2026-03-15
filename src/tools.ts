import type { OpenClawPluginApi } from "openclaw/plugin-sdk"
import { Type, type Static } from "@sinclair/typebox"
import { resolveToken, type PluginConfig } from "./config.js"
import { HulunoteClient } from "./hulunote/client.js"
import type { DatabaseInfo, NoteInfo } from "./hulunote/types.js"
import { buildOutlineTree, normalizeSearch, renderOutlineText, textResult, truncate, uuid } from "./utils.js"

// ── Parameter schemas ──────────────────────────────────────────────────

const ListDatabasesParamsSchema = Type.Object({}, { additionalProperties: false })

const ListNotesParamsSchema = Type.Object(
  {
    databaseId: Type.Optional(
      Type.String({
        description:
          "Database ID to list notes from. If omitted, use the configured defaultDatabaseId.",
      }),
    ),
    page: Type.Optional(Type.Number({ description: "Page number for pagination (1-based)." })),
    size: Type.Optional(Type.Number({ description: "Number of notes per page." })),
  },
  { additionalProperties: false },
)

const ReadNoteParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID to read." }),
  },
  { additionalProperties: false },
)

const SearchNotesParamsSchema = Type.Object(
  {
    query: Type.String({ description: "Search query to match against note titles." }),
    databaseId: Type.Optional(
      Type.String({
        description:
          "Optional database ID to restrict search. If omitted, search across all databases.",
      }),
    ),
  },
  { additionalProperties: false },
)

const CreateNoteParamsSchema = Type.Object(
  {
    databaseId: Type.Optional(
      Type.String({
        description:
          "Database ID to create the note in. If omitted, use the configured defaultDatabaseId.",
      }),
    ),
    title: Type.String({ description: "Title of the new note." }),
  },
  { additionalProperties: false },
)

const AddOutlineNodeParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID to add the outline node to." }),
    parentNavId: Type.String({
      description:
        "Parent nav ID. Use the note's root-nav-id for top-level nodes, or another nav ID for children.",
    }),
    content: Type.String({ description: "The text content of the new outline node." }),
    order: Type.Optional(
      Type.Number({
        description: "Ordering value among siblings. Defaults to 1.0.",
      }),
    ),
  },
  { additionalProperties: false },
)

const UpdateOutlineNodeParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID the outline node belongs to." }),
    navId: Type.String({ description: "The nav ID of the outline node to update." }),
    content: Type.String({ description: "The new text content for the outline node." }),
  },
  { additionalProperties: false },
)

const DeleteOutlineNodeParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID the outline node belongs to." }),
    navId: Type.String({ description: "The nav ID of the outline node to delete." }),
  },
  { additionalProperties: false },
)

const CreateDatabaseParamsSchema = Type.Object(
  {
    name: Type.String({ description: "Name of the new database." }),
    description: Type.Optional(Type.String({ description: "Optional description for the database." })),
  },
  { additionalProperties: false },
)

const DeleteDatabaseParamsSchema = Type.Object(
  {
    databaseId: Type.String({ description: "The database ID to delete." }),
  },
  { additionalProperties: false },
)

const UpdateDatabaseParamsSchema = Type.Object(
  {
    databaseId: Type.String({ description: "The database ID to update." }),
    name: Type.Optional(Type.String({ description: "New name for the database." })),
    isPublic: Type.Optional(Type.Boolean({ description: "Set the database as public or private." })),
    isDefault: Type.Optional(Type.Boolean({ description: "Set the database as the default." })),
  },
  { additionalProperties: false },
)

const DeleteNoteParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID to delete." }),
  },
  { additionalProperties: false },
)

const UpdateNoteTitleParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID to rename." }),
    title: Type.String({ description: "The new title for the note." }),
  },
  { additionalProperties: false },
)

const ToggleShortcutParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID to toggle shortcut status." }),
    isShortcut: Type.Boolean({ description: "Set to true to mark as shortcut, false to remove." }),
  },
  { additionalProperties: false },
)

const ListShortcutsParamsSchema = Type.Object(
  {
    databaseId: Type.Optional(
      Type.String({
        description:
          "Database ID to list shortcuts from. If omitted, use the configured defaultDatabaseId.",
      }),
    ),
  },
  { additionalProperties: false },
)

const MoveOutlineNodeParamsSchema = Type.Object(
  {
    noteId: Type.String({ description: "The note ID the outline node belongs to." }),
    navId: Type.String({ description: "The nav ID of the outline node to move." }),
    newParentId: Type.String({
      description: "The new parent nav ID. Use the note's root-nav-id for top-level.",
    }),
    newOrder: Type.Number({ description: "The new ordering value among siblings." }),
  },
  { additionalProperties: false },
)

const ImportNotesParamsSchema = Type.Object(
  {
    databaseId: Type.Optional(
      Type.String({
        description:
          "Database ID to import into. If omitted, use the configured defaultDatabaseId.",
      }),
    ),
    jsonContent: Type.String({
      description:
        'JSON string with import data. Format: {"note":{"hulunote-notes/title":"Title"},"navs":[{"content":"text","parid":"root-nav-id","same-deep-order":1}]}',
    }),
    filename: Type.Optional(
      Type.String({ description: 'Filename for the import. Defaults to "import.json".' }),
    ),
  },
  { additionalProperties: false },
)

const SyncNavsParamsSchema = Type.Object(
  {
    databaseId: Type.Optional(
      Type.String({
        description:
          "Database ID to sync navs from. If omitted, use the configured defaultDatabaseId.",
      }),
    ),
    backendTs: Type.Optional(
      Type.Number({
        description:
          "Timestamp in milliseconds. Only return navs updated after this time. Omit for all navs.",
      }),
    ),
    page: Type.Optional(Type.Number({ description: "Page number for pagination (1-based)." })),
    size: Type.Optional(Type.Number({ description: "Number of navs per page (max 5000)." })),
  },
  { additionalProperties: false },
)

const GetAllNavsParamsSchema = Type.Object(
  {
    databaseId: Type.Optional(
      Type.String({
        description:
          "Database ID to get navs from. If omitted, use the configured defaultDatabaseId.",
      }),
    ),
    backendTs: Type.Optional(
      Type.Number({
        description:
          "Timestamp in milliseconds. Only return navs updated after this time. Omit for all navs.",
      }),
    ),
  },
  { additionalProperties: false },
)

type ListDatabasesParams = Static<typeof ListDatabasesParamsSchema>
type ListNotesParams = Static<typeof ListNotesParamsSchema>
type ReadNoteParams = Static<typeof ReadNoteParamsSchema>
type SearchNotesParams = Static<typeof SearchNotesParamsSchema>
type CreateNoteParams = Static<typeof CreateNoteParamsSchema>
type AddOutlineNodeParams = Static<typeof AddOutlineNodeParamsSchema>
type UpdateOutlineNodeParams = Static<typeof UpdateOutlineNodeParamsSchema>
type DeleteOutlineNodeParams = Static<typeof DeleteOutlineNodeParamsSchema>
type CreateDatabaseParams = Static<typeof CreateDatabaseParamsSchema>
type DeleteDatabaseParams = Static<typeof DeleteDatabaseParamsSchema>
type UpdateDatabaseParams = Static<typeof UpdateDatabaseParamsSchema>
type DeleteNoteParams = Static<typeof DeleteNoteParamsSchema>
type UpdateNoteTitleParams = Static<typeof UpdateNoteTitleParamsSchema>
type ToggleShortcutParams = Static<typeof ToggleShortcutParamsSchema>
type ListShortcutsParams = Static<typeof ListShortcutsParamsSchema>
type MoveOutlineNodeParams = Static<typeof MoveOutlineNodeParamsSchema>
type ImportNotesParams = Static<typeof ImportNotesParamsSchema>
type SyncNavsParams = Static<typeof SyncNavsParamsSchema>
type GetAllNavsParams = Static<typeof GetAllNavsParamsSchema>

// ── Formatters ─────────────────────────────────────────────────────────

const formatDatabaseList = (databases: DatabaseInfo[]) => {
  if (databases.length === 0) return "No databases found."
  const lines = ["Databases:", ""]
  for (const db of databases) {
    const name = db["hulunote-databases/name"]
    const id = db["hulunote-databases/id"]
    const desc = db["hulunote-databases/description"]
    const isDefault = db["hulunote-databases/is-default"] ? " (default)" : ""
    lines.push(`- ${name}${isDefault}`)
    lines.push(`  ID: ${id}`)
    if (desc) lines.push(`  Description: ${desc}`)
  }
  return lines.join("\n")
}

const formatNoteList = (notes: NoteInfo[], allPages: number, page?: number) => {
  if (notes.length === 0) return "No notes found in this database."
  const lines = [`Notes (page ${page ?? 1} of ${allPages}):`, ""]
  for (const note of notes) {
    const title = note["hulunote-notes/title"]
    const id = note["hulunote-notes/id"]
    const rootNavId = note["hulunote-notes/root-nav-id"]
    const shortcut = note["hulunote-notes/is-shortcut"] ? " [shortcut]" : ""
    const updatedAt = note["hulunote-notes/updated-at"]
    lines.push(`- ${title}${shortcut}`)
    lines.push(`  ID: ${id}`)
    lines.push(`  Root Nav ID: ${rootNavId}`)
    if (updatedAt) lines.push(`  Updated: ${updatedAt}`)
  }
  return lines.join("\n")
}

const formatSearchResults = (results: { note: NoteInfo; databaseName: string }[]) => {
  if (results.length === 0) return "No notes matched the search query."
  const lines = [`Found ${results.length} matching note(s):`, ""]
  for (const { note, databaseName } of results) {
    const title = note["hulunote-notes/title"]
    const id = note["hulunote-notes/id"]
    const rootNavId = note["hulunote-notes/root-nav-id"]
    lines.push(`- ${title}`)
    lines.push(`  ID: ${id}`)
    lines.push(`  Root Nav ID: ${rootNavId}`)
    lines.push(`  Database: ${databaseName}`)
  }
  return lines.join("\n")
}

// ── Client helper ──────────────────────────────────────────────────────

const createClient = (config: PluginConfig): HulunoteClient => {
  const token = resolveToken(config)
  if (!token) {
    throw new Error(
      'No authentication token found. Configure "tokenEnv" in the plugin config and set the corresponding environment variable.',
    )
  }
  return new HulunoteClient({ serverUrl: config.serverUrl, token })
}

const resolveDatabaseId = (config: PluginConfig, explicitId?: string): string => {
  const id = explicitId ?? config.defaultDatabaseId
  if (!id) {
    throw new Error(
      'No database ID provided. Pass databaseId or configure "defaultDatabaseId" in the plugin config.',
    )
  }
  return id
}

// ── Tool registration ──────────────────────────────────────────────────

/** Registers all Hulunote OpenClaw tools for this plugin instance. */
export const registerHulunoteTools = (api: OpenClawPluginApi, pluginConfig: PluginConfig) => {
  api.registerTool({
    name: "hulunote_list_databases",
    label: "Hulunote List Databases",
    description:
      "List all databases (notebooks) for the authenticated Hulunote user. Use this to discover available databases before listing notes.",
    parameters: ListDatabasesParamsSchema,
    async execute(_id: string, _params: ListDatabasesParams) {
      const client = createClient(pluginConfig)
      const databases = await client.getDatabaseList()
      return textResult(formatDatabaseList(databases))
    },
  })

  api.registerTool({
    name: "hulunote_list_notes",
    label: "Hulunote List Notes",
    description:
      "List notes in a Hulunote database. If databaseId is omitted, use the configured defaultDatabaseId. Returns note IDs and root nav IDs needed for reading note outlines.",
    parameters: ListNotesParamsSchema,
    async execute(_id: string, params: ListNotesParams) {
      const client = createClient(pluginConfig)
      const databaseId = resolveDatabaseId(pluginConfig, params.databaseId)
      const { notes, allPages } = await client.getNoteList(databaseId, params.page, params.size)
      return textResult(formatNoteList(notes, allPages, params.page))
    },
  })

  api.registerTool({
    name: "hulunote_read_note",
    label: "Hulunote Read Note",
    description:
      "Read a Hulunote note's full outline content as an indented tree. Requires the note ID (get it from hulunote_list_notes or hulunote_search_notes). Returns the hierarchical outline text.",
    parameters: ReadNoteParamsSchema,
    async execute(_id: string, params: ReadNoteParams) {
      const client = createClient(pluginConfig)

      // First, we need to find the note to get the root-nav-id
      // We'll get the navs directly and find the root from the nav structure
      const navs = await client.getNoteNavs(params.noteId)
      if (navs.length === 0) return textResult("This note has no outline content.")

      // Find all unique parent IDs that are not nav IDs themselves - the root nav ID
      const navIds = new Set(navs.map(n => n.id))
      const rootParentIds = new Set<string>()
      for (const nav of navs) {
        if (!navIds.has(nav.parid)) {
          rootParentIds.add(nav.parid)
        }
      }

      // Build tree from each root parent
      const lines: string[] = []
      for (const rootId of rootParentIds) {
        const tree = buildOutlineTree(navs, rootId)
        if (tree.length > 0) {
          lines.push(renderOutlineText(tree))
        }
      }

      if (lines.length === 0) return textResult("This note has no outline content.")
      return textResult(lines.join("\n"))
    },
  })

  api.registerTool({
    name: "hulunote_search_notes",
    label: "Hulunote Search Notes",
    description:
      "Search for notes by title across one or all databases. Returns matching note IDs that can be used with hulunote_read_note.",
    parameters: SearchNotesParamsSchema,
    async execute(_id: string, params: SearchNotesParams) {
      const client = createClient(pluginConfig)
      const query = normalizeSearch(params.query)
      const results: { note: NoteInfo; databaseName: string }[] = []

      if (params.databaseId) {
        // Search in specific database
        const notes = await client.getAllNotes(params.databaseId)
        for (const note of notes) {
          if (normalizeSearch(note["hulunote-notes/title"]).includes(query)) {
            results.push({ note, databaseName: params.databaseId })
          }
        }
      } else {
        // Search across all databases
        const databases = await client.getDatabaseList()
        for (const db of databases) {
          if (db["hulunote-databases/is-delete"]) continue
          const dbId = db["hulunote-databases/id"]
          const dbName = db["hulunote-databases/name"]
          const notes = await client.getAllNotes(dbId)
          for (const note of notes) {
            if (normalizeSearch(note["hulunote-notes/title"]).includes(query)) {
              results.push({ note, databaseName: dbName })
            }
          }
        }
      }

      return textResult(formatSearchResults(results))
    },
  })

  api.registerTool({
    name: "hulunote_create_note",
    label: "Hulunote Create Note",
    description:
      "Create a new note in a Hulunote database. Returns the new note ID and root nav ID for adding outline content.",
    parameters: CreateNoteParamsSchema,
    async execute(_id: string, params: CreateNoteParams) {
      const client = createClient(pluginConfig)
      const databaseId = resolveDatabaseId(pluginConfig, params.databaseId)
      const note = await client.createNote(databaseId, params.title)
      return textResult(
        [
          `Note created: ${note["hulunote-notes/title"]}`,
          `Note ID: ${note["hulunote-notes/id"]}`,
          `Root Nav ID: ${note["hulunote-notes/root-nav-id"]}`,
          `Database ID: ${note["hulunote-notes/database-id"]}`,
          "",
          "Use hulunote_add_outline_node with the Root Nav ID as parentNavId to add top-level outline content.",
        ].join("\n"),
      )
    },
  })

  api.registerTool({
    name: "hulunote_add_outline_node",
    label: "Hulunote Add Outline Node",
    description:
      "Add a new outline node to a note. Use the note's root-nav-id as parentNavId for top-level items, or use another nav ID to create child nodes. Get root-nav-id from hulunote_list_notes, hulunote_search_notes, or hulunote_create_note.",
    parameters: AddOutlineNodeParamsSchema,
    async execute(_id: string, params: AddOutlineNodeParams) {
      const client = createClient(pluginConfig)
      const navId = uuid()
      const order = params.order ?? 1.0
      const createdId = await client.createNav(
        params.noteId,
        navId,
        params.parentNavId,
        params.content,
        order,
      )
      return textResult(
        [
          `Outline node created.`,
          `Nav ID: ${createdId}`,
          `Content: ${truncate(params.content, 80)}`,
          `Parent Nav ID: ${params.parentNavId}`,
          `Order: ${order}`,
        ].join("\n"),
      )
    },
  })

  api.registerTool({
    name: "hulunote_update_outline_node",
    label: "Hulunote Update Outline Node",
    description:
      "Update the text content of an existing outline node. Get the nav ID from hulunote_read_note output or from a previous hulunote_add_outline_node result.",
    parameters: UpdateOutlineNodeParamsSchema,
    async execute(_id: string, params: UpdateOutlineNodeParams) {
      const client = createClient(pluginConfig)
      await client.updateNavContent(params.noteId, params.navId, params.content)
      return textResult(
        [
          `Outline node updated.`,
          `Nav ID: ${params.navId}`,
          `New content: ${truncate(params.content, 80)}`,
        ].join("\n"),
      )
    },
  })

  api.registerTool({
    name: "hulunote_delete_outline_node",
    label: "Hulunote Delete Outline Node",
    description:
      "Delete an outline node from a note. This is a soft delete. Get the nav ID from hulunote_read_note.",
    parameters: DeleteOutlineNodeParamsSchema,
    async execute(_id: string, params: DeleteOutlineNodeParams) {
      const client = createClient(pluginConfig)
      await client.deleteNav(params.noteId, params.navId)
      return textResult(`Outline node deleted. Nav ID: ${params.navId}`)
    },
  })

  api.registerTool({
    name: "hulunote_create_database",
    label: "Hulunote Create Database",
    description: "Create a new database (notebook) for the authenticated user.",
    parameters: CreateDatabaseParamsSchema,
    async execute(_id: string, params: CreateDatabaseParams) {
      const client = createClient(pluginConfig)
      const db = await client.createDatabase(params.name, params.description)
      return textResult(
        [
          `Database created: ${db["hulunote-databases/name"]}`,
          `ID: ${db["hulunote-databases/id"]}`,
          db["hulunote-databases/description"]
            ? `Description: ${db["hulunote-databases/description"]}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
    },
  })

  api.registerTool({
    name: "hulunote_delete_database",
    label: "Hulunote Delete Database",
    description:
      "Delete a database (soft delete). This also soft-deletes all notes and outline nodes in the database.",
    parameters: DeleteDatabaseParamsSchema,
    async execute(_id: string, params: DeleteDatabaseParams) {
      const client = createClient(pluginConfig)
      await client.deleteDatabase(params.databaseId)
      return textResult(`Database deleted. ID: ${params.databaseId}`)
    },
  })

  api.registerTool({
    name: "hulunote_update_database",
    label: "Hulunote Update Database",
    description:
      "Update database properties: rename, set as public/private, or set as the default database.",
    parameters: UpdateDatabaseParamsSchema,
    async execute(_id: string, params: UpdateDatabaseParams) {
      const client = createClient(pluginConfig)
      await client.updateDatabase(params.databaseId, {
        name: params.name,
        isPublic: params.isPublic,
        isDefault: params.isDefault,
      })
      const changes: string[] = []
      if (params.name != null) changes.push(`name → ${params.name}`)
      if (params.isPublic != null) changes.push(`public → ${params.isPublic}`)
      if (params.isDefault != null) changes.push(`default → ${params.isDefault}`)
      return textResult(`Database updated (${params.databaseId}): ${changes.join(", ")}`)
    },
  })

  api.registerTool({
    name: "hulunote_delete_note",
    label: "Hulunote Delete Note",
    description: "Delete a note (soft delete). The note can potentially be recovered later.",
    parameters: DeleteNoteParamsSchema,
    async execute(_id: string, params: DeleteNoteParams) {
      const client = createClient(pluginConfig)
      await client.deleteNote(params.noteId)
      return textResult(`Note deleted. ID: ${params.noteId}`)
    },
  })

  api.registerTool({
    name: "hulunote_update_note_title",
    label: "Hulunote Update Note Title",
    description: "Rename a note by updating its title.",
    parameters: UpdateNoteTitleParamsSchema,
    async execute(_id: string, params: UpdateNoteTitleParams) {
      const client = createClient(pluginConfig)
      await client.updateNoteTitle(params.noteId, params.title)
      return textResult(`Note renamed. ID: ${params.noteId}, New title: ${params.title}`)
    },
  })

  api.registerTool({
    name: "hulunote_toggle_shortcut",
    label: "Hulunote Toggle Shortcut",
    description: "Toggle a note's shortcut (favorite) status. Shortcut notes appear in a quick-access list.",
    parameters: ToggleShortcutParamsSchema,
    async execute(_id: string, params: ToggleShortcutParams) {
      const client = createClient(pluginConfig)
      await client.toggleShortcut(params.noteId, params.isShortcut)
      const action = params.isShortcut ? "added to" : "removed from"
      return textResult(`Note ${action} shortcuts. ID: ${params.noteId}`)
    },
  })

  api.registerTool({
    name: "hulunote_list_shortcuts",
    label: "Hulunote List Shortcuts",
    description:
      "List all shortcut (favorite) notes in a database. These are notes marked for quick access.",
    parameters: ListShortcutsParamsSchema,
    async execute(_id: string, params: ListShortcutsParams) {
      const client = createClient(pluginConfig)
      const databaseId = resolveDatabaseId(pluginConfig, params.databaseId)
      const notes = await client.getShortcuts(databaseId)
      if (notes.length === 0) return textResult("No shortcut notes found in this database.")
      const lines = [`Shortcut notes (${notes.length}):`, ""]
      for (const note of notes) {
        const title = note["hulunote-notes/title"]
        const id = note["hulunote-notes/id"]
        const rootNavId = note["hulunote-notes/root-nav-id"]
        lines.push(`- ${title}`)
        lines.push(`  ID: ${id}`)
        lines.push(`  Root Nav ID: ${rootNavId}`)
      }
      return textResult(lines.join("\n"))
    },
  })

  api.registerTool({
    name: "hulunote_move_outline_node",
    label: "Hulunote Move Outline Node",
    description:
      "Move an outline node to a new parent or reorder it among siblings. Use this for indent, outdent, or reordering operations.",
    parameters: MoveOutlineNodeParamsSchema,
    async execute(_id: string, params: MoveOutlineNodeParams) {
      const client = createClient(pluginConfig)
      await client.updateNavParent(params.noteId, params.navId, params.newParentId, params.newOrder)
      return textResult(
        [
          `Outline node moved.`,
          `Nav ID: ${params.navId}`,
          `New parent: ${params.newParentId}`,
          `New order: ${params.newOrder}`,
        ].join("\n"),
      )
    },
  })

  api.registerTool({
    name: "hulunote_import_notes",
    label: "Hulunote Import Notes",
    description:
      'Import notes from JSON data into a database. The JSON should follow the Hulunote import format: {"note":{"hulunote-notes/title":"Title"},"navs":[{"content":"text","parid":"root-nav-id","same-deep-order":1}]}',
    parameters: ImportNotesParamsSchema,
    async execute(_id: string, params: ImportNotesParams) {
      const client = createClient(pluginConfig)
      const databaseId = resolveDatabaseId(pluginConfig, params.databaseId)
      const filename = params.filename ?? "import.json"
      const result = await client.importNotes(databaseId, params.jsonContent, filename)
      const lines = [
        `Import complete.`,
        `Imported: ${result["imported-count"]} note(s)`,
        `Errors: ${result["error-count"]}`,
      ]
      if (result.imported.length > 0) {
        lines.push("", "Imported notes:")
        for (const item of result.imported) {
          lines.push(`- ${item.title} (ID: ${item["note-id"]}, navs: ${item["nav-count"]})`)
        }
      }
      if (result.errors.length > 0) {
        lines.push("", "Errors:")
        for (const err of result.errors) {
          lines.push(`- ${err.file}: ${err.error}`)
        }
      }
      return textResult(lines.join("\n"))
    },
  })

  api.registerTool({
    name: "hulunote_sync_navs",
    label: "Hulunote Sync Navs",
    description:
      "Get outline nodes with pagination, optionally filtered by a sync timestamp. Useful for incremental sync or bulk inspection of outline data.",
    parameters: SyncNavsParamsSchema,
    async execute(_id: string, params: SyncNavsParams) {
      const client = createClient(pluginConfig)
      const databaseId = resolveDatabaseId(pluginConfig, params.databaseId)
      const result = await client.getAllNavsByPage(databaseId, {
        backendTs: params.backendTs,
        page: params.page,
        size: params.size,
      })
      const lines = [
        `Navs (page ${params.page ?? 1} of ${result.allPages}):`,
        `Backend timestamp: ${result.backendTs}`,
        `Count: ${result.navs.length}`,
        "",
      ]
      for (const nav of result.navs) {
        lines.push(`- [${nav.id}] ${truncate(nav.content, 60)} (parent: ${nav.parid})`)
      }
      return textResult(lines.join("\n"))
    },
  })

  api.registerTool({
    name: "hulunote_get_all_navs",
    label: "Hulunote Get All Navs",
    description:
      "Get all outline nodes in a database, optionally filtered by a sync timestamp. Returns all navs without pagination.",
    parameters: GetAllNavsParamsSchema,
    async execute(_id: string, params: GetAllNavsParams) {
      const client = createClient(pluginConfig)
      const databaseId = resolveDatabaseId(pluginConfig, params.databaseId)
      const result = await client.getAllNavs(databaseId, params.backendTs)
      const lines = [
        `All navs in database:`,
        `Backend timestamp: ${result.backendTs}`,
        `Total count: ${result.navs.length}`,
        "",
      ]
      for (const nav of result.navs) {
        lines.push(`- [${nav.id}] ${truncate(nav.content, 60)} (parent: ${nav.parid})`)
      }
      return textResult(lines.join("\n"))
    },
  })
}
