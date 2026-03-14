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

type ListDatabasesParams = Static<typeof ListDatabasesParamsSchema>
type ListNotesParams = Static<typeof ListNotesParamsSchema>
type ReadNoteParams = Static<typeof ReadNoteParamsSchema>
type SearchNotesParams = Static<typeof SearchNotesParamsSchema>
type CreateNoteParams = Static<typeof CreateNoteParamsSchema>
type AddOutlineNodeParams = Static<typeof AddOutlineNodeParamsSchema>
type UpdateOutlineNodeParams = Static<typeof UpdateOutlineNodeParamsSchema>
type DeleteOutlineNodeParams = Static<typeof DeleteOutlineNodeParamsSchema>

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
}
