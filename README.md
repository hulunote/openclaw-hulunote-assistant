# Hulunote Assistant

OpenClaw plugin for managing Hulunote notes — browse databases, read and write notes, and manage outlines.

## Installation

```bash
openclaw plugins install -l /path/to/openclaw-hulunote-assistant
```

## Configuration

Add to your OpenClaw config:

```json
{
  "plugins": {
    "allow": ["hulunote-assistant"],
    "entries": {
      "hulunote-assistant": {
        "enabled": true,
        "config": {
          "serverUrl": "http://localhost:6689",
          "tokenEnv": "HULUNOTE_TOKEN",
          "defaultDatabaseId": "your-default-database-id"
        }
      }
    }
  },
  "tools": {
    "allow": [
      "hulunote_list_databases",
      "hulunote_list_notes",
      "hulunote_read_note",
      "hulunote_search_notes",
      "hulunote_create_note",
      "hulunote_add_outline_node",
      "hulunote_update_outline_node",
      "hulunote_delete_outline_node"
    ]
  }
}
```

## Setup

1. Get your Hulunote authentication token (from login)
2. Set it as an environment variable: `export HULUNOTE_TOKEN=your-token-here`
3. Configure the plugin with `tokenEnv: "HULUNOTE_TOKEN"`
4. Optionally set `serverUrl` if not using `http://localhost:6689`
5. Optionally set `defaultDatabaseId` for convenience

## Tools

| Tool | Description |
|------|-------------|
| `hulunote_list_databases` | List all databases for the authenticated user |
| `hulunote_list_notes` | List notes in a database (paginated) |
| `hulunote_read_note` | Read a note's full outline as indented text |
| `hulunote_search_notes` | Search notes by title across databases |
| `hulunote_create_note` | Create a new note |
| `hulunote_add_outline_node` | Add an outline node to a note |
| `hulunote_update_outline_node` | Update an outline node's content |
| `hulunote_delete_outline_node` | Delete an outline node |

## Skills

- **note-reading** — Triggered when users ask to read, browse, or find notes
- **note-writing** — Triggered when users ask to create or edit notes
