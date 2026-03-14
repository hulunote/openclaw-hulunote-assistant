---
name: "note-reading"
description: "Read and browse Hulunote notes. Use when the user asks to read, view, open, browse, or find a note, or wants to see note content, outlines, or databases."
---

# Note Reading

Use `hulunote_list_databases` first if the user hasn't specified a database. Then use `hulunote_list_notes` or `hulunote_search_notes` to find notes. Finally use `hulunote_read_note` to read the full outline.

Do not ask the user for note IDs before trying to search. If the user mentions a note by title, use `hulunote_search_notes` to find it first.

Present the outline content in a readable, indented format. Summarize long outlines if the user asks for a summary.
