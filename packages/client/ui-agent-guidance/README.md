# @deepseek-ai/dsh-client-ui-agent-guidance

English | [中文](README.zh.md)

Web Settings page for the `agent-guidance` namespace. One page manages the global main-Agent prompt, project prompts, the project option that excludes the global prompt, four non-deletable built-in helpers, and user-created helpers.

Each helper editor contains its id, name, purpose, prompt, optional provider and model, exact tool allow-list, and delegation option. Built-in helpers can be edited but not deleted or allowed to delegate. Saving takes effect from the next model request in current and new sessions.

The browser package sends no model content itself. `@deepseek-ai/dsh-agent-guidance` owns rendering, durable snapshots, project matching, built-in restoration, and live delegation resolution.

## Model Experience

Indirectly, through the live configuration applied by `@deepseek-ai/dsh-agent-guidance`. The page does not send model content.

#### KV Cache effect

Saving a change adds a new Agent-guidance snapshot before the next model request. An unchanged save adds nothing.

## Known Limitations and Deferred Work

- Main-Agent model selection and full tool composition remain on the existing Models and Agent Presets pages.
- A helper tool name is entered as text because the host does not yet expose a tool-name catalog to this page.
