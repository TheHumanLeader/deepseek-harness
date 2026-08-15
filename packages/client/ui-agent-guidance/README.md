# @deepseek-ai/dsh-client-ui-agent-guidance

English | [中文](README.zh.md)

Web Settings page for the global main-Agent instructions owned by `@deepseek-ai/dsh-agent-guidance`. It edits the `agent-guidance` settings namespace and states that changes affect only main-Agent sessions started afterward.

The page can enable or disable the instructions, edit their text, restore the deployment default, and preview the exact editable content. A remote or read-only deployment shows the namespace as unavailable or read-only instead of pretending that a write succeeded.

## Model Experience

### Settings-authored instructions

#### What the model sees

This browser package sends no content to the model itself. The Host package captures the saved prompt in the next top-level session; its README defines the complete model-visible wrapper.

#### Token effect

No direct token effect. Saved text changes the bounded snapshot added by `dsh-agent-guidance` to later top-level sessions.

#### KV Cache effect

No direct cache effect. The Host applies settings only to later sessions and keeps active sessions unchanged.

## Known Limitations and Deferred Work

- **Global main Agent only** — project-level inheritance and auxiliary Agent management need their own settings surfaces.
- **No mid-session edit** — this page intentionally does not alter instructions already captured by a running session.
