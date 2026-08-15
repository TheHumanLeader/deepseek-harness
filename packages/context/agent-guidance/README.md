# @deepseek-ai/dsh-agent-guidance

English | [中文](README.zh.md)

Live configuration for the main Agent, project instructions, and managed helper Agents. It targets two failures: acting beyond the stage the user requested and continuing retrieval after enough information is available.

Before every top-level model request, the plugin combines the latest enabled global prompt, the deepest matching project prompt, and the current managed-Agent catalog. A project can exclude only the user-configured global prompt. When the rendered configuration changes, a new durable snapshot is appended and states that it replaces earlier Agent-guidance snapshots. Subagents do not receive the main-Agent snapshot.

The four built-in helper ids are `researcher`, `project-explorer`, `reviewer`, and `agent-manager`. Stored settings may edit them but cannot remove them: the resolver restores any missing built-in definition. User-created Agent ids use lowercase letters, digits, and hyphens. The runtime resolver returns the latest prompt, optional model route, and enforced tool allow-list whenever `managed_agent` starts a child.

`researcher` defaults to `web_search` and instructions that require user-provided material first, official or primary sources, one unresolved question per search, and a stop when the answer is sufficient or another search adds nothing useful.

## Model Experience

### Live Agent-guidance snapshot

#### What the model sees

The main Agent sees one `<system-reminder>` containing the latest global and matching project instructions plus the available managed Agent ids and purposes. A changed snapshot states that it supersedes earlier Agent-guidance snapshots.

#### Token effect

The prompt adds the enabled global and matching project text plus one line per managed Agent. An unchanged setting adds no new message; a changed setting appends one replayable snapshot.

#### KV Cache effect

An unchanged snapshot preserves the request prefix. A changed setting appends a new message before the next model request and therefore extends the prefix.

## Known Limitations and Deferred Work

- Prompt rules improve instruction following but do not grant new authority or bypass approval policy.
- Main-Agent model selection remains owned by the existing model settings, and its full tool composition remains owned by Agent presets.
