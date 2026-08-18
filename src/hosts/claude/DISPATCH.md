## Delegating on this host

The agents in `.claude/agents/` are registered automatically — delegate to
one by name (`backend-eng`, `reviewer`, and so on) and it runs in its own
context with its own tool grant. The skills in `.claude/skills/` are
available the same way; invoke one by name rather than reimplementing what
it describes.

Claude Code reads that registration once, at session start — an agent or
skill file written mid-session (by `hedgehog init` or `hedgehog update`
just now) is not yet dispatchable by name in this session. If a name-based
dispatch reports it as not found, read the file directly from
`.claude/agents/` or `.claude/skills/` and follow it inline instead of
retrying the dispatch; it becomes dispatchable by name after a session
restart or a fresh context.

Clear context with `/clear` at the unit boundaries described above —
`hedgehog boundary` tells you whether you're at one (exit 0), and
`hedgehog boundary --handoff` is what the next session starts from.
