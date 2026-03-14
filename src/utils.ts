import type { AgentToolResult } from "@mariozechner/pi-agent-core"
import type { NavInfo, OutlineNode } from "./hulunote/types.js"

/** Wraps plain text as an OpenClaw text tool result. */
export const textResult = (text: string): AgentToolResult<unknown> => ({
  content: [{ type: "text", text }],
  details: null,
})

/** Generates a UUID v4 string for new nav node IDs. */
export const uuid = () => crypto.randomUUID()

/** Builds a tree of OutlineNodes from a flat list of NavInfo entries. */
export const buildOutlineTree = (navs: NavInfo[], rootNavId: string): OutlineNode[] => {
  const byParent = new Map<string, NavInfo[]>()

  for (const nav of navs) {
    if (nav["is-delete"]) continue
    const parentId = nav.parid
    const existing = byParent.get(parentId)
    if (existing) {
      existing.push(nav)
    } else {
      byParent.set(parentId, [nav])
    }
  }

  for (const children of byParent.values()) {
    children.sort((a, b) => a["same-deep-order"] - b["same-deep-order"])
  }

  const buildChildren = (parentId: string, depth: number): OutlineNode[] => {
    const children = byParent.get(parentId)
    if (!children) return []

    return children.map(nav => ({
      id: nav.id,
      parentId: nav.parid,
      content: nav.content,
      depth,
      order: nav["same-deep-order"],
      children: buildChildren(nav.id, depth + 1),
    }))
  }

  return buildChildren(rootNavId, 0)
}

/** Renders an outline tree as indented text. */
export const renderOutlineText = (nodes: OutlineNode[], indent = ""): string => {
  const lines: string[] = []
  for (const node of nodes) {
    lines.push(`${indent}- ${node.content}`)
    if (node.children.length > 0) {
      lines.push(renderOutlineText(node.children, indent + "  "))
    }
  }
  return lines.join("\n")
}

/** Truncates a string to a given length with ellipsis. */
export const truncate = (text: string, maxLength: number) =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "..."

/** Normalizes text for fuzzy search comparison. */
export const normalizeSearch = (value: string) => value.trim().toLowerCase()
