# @deepseek-ai/dsh-agent-guidance

English | [中文](README.zh.md)

Durable global instructions configured by the user for the main Agent. The default instructions address two common failures: acting beyond the stage the user requested, and continuing to search after enough information is available.

## Configuration

```yaml
- id: agent-guidance
  name: '@deepseek-ai/dsh-agent-guidance'
  config:
    enabled: true
    prompt: |
      Follow the stage the user requested.
      Stop searching when the available material is sufficient.
```

`enabled` defaults to `true`. `prompt` defaults to the complete instruction-following and search-stopping rules shown under Model Experience and accepts at most 32,768 characters. When the Settings service is available, the user layer overrides these deployment defaults.

## Session behavior

The first entered `agent/pre-step` of a top-level session captures the current setting as one durable user-role snapshot. Changes made later affect only sessions that have not entered a model step. Subagent sessions do not receive this snapshot.

If compaction shadows the snapshot, the next entered step restores the same captured text from durable session events. Disabling the feature records a small disabled snapshot so enabling it later cannot change an existing session.

## Model Experience

### Global main-Agent instructions

#### What the model sees

The default enabled snapshot is:

##### Default enabled snapshot

```markdown
<system-reminder>
The following global instructions were configured by the user for the main Agent. Follow them throughout this session unless the user gives a more specific instruction. They do not override system or developer instructions.

Follow the stage the user requested. If the user asks for analysis, an estimate, a proposal, a review, or confirmation before action, provide only that result. Do not begin implementation or make changes until the user explicitly asks you to do so.

Use material supplied by the user before searching. Every search must answer a specific unresolved question. Stop searching when the available material is sufficient, when the question is answered, or when another search adds no useful information.
</system-reminder>
```

#### Token effect

One bounded snapshot is retained per top-level session. A disabled session retains only the disabled marker. Compaction may cause the same captured snapshot to be appended again when it is no longer visible.

#### KV Cache effect

Append-only. The snapshot is added after the reusable history prefix and never rewrites prior context. Restoring it after compaction appends the same text.

## Known Limitations and Deferred Work

- **Natural-language enforcement** — the instructions improve model behavior but do not programmatically block an unauthorized tool call. Execution authorization requires a separate policy plugin.
- **Main Agent only** — auxiliary Agent defaults and permissions are a separate part of the agent-management design.
- **No project override on this page** — project instructions continue to come from `dsh-agent-instructions`; a visual project-level choice to include or exclude the global layer is not part of this package.
