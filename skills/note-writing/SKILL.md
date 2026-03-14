---
name: "note-writing"
description: "Create and edit Hulunote notes and outlines. Use when the user asks to create a note, add content, edit outline items, or organize notes."
---

# Note Writing

When creating a new note, use `hulunote_create_note` first, then add outline content with `hulunote_add_outline_node` using the returned root nav ID as the parentNavId for top-level items.

When editing existing notes, use `hulunote_read_note` first to see current content and get nav IDs, then use `hulunote_update_outline_node` or `hulunote_delete_outline_node` as needed.

For hierarchical content, add parent nodes first, then use their returned nav IDs as parentNavId for child nodes. Set the `order` parameter to control sibling ordering (e.g. 1.0, 2.0, 3.0).

Confirm with the user before deleting outline nodes.
