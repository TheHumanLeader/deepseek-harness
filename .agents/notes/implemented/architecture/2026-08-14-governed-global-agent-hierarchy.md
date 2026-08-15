# Agent Note: Helping agents follow instructions and stop unproductive searches

Status: implemented

English | [中文](2026-08-14-governed-global-agent-hierarchy.zh.md)

## Problem

This proposal addresses only two problems:

1. **Weak instruction following.** A user asks for analysis, a proposal, or confirmation first, but the agent may start implementation immediately.
2. **Too much reasoning and retrieval.** The user has supplied the relevant material or the question is already answered, but the agent may continue searching until the user interrupts it.

Hermes already has prompts, Agent configuration, project configuration, and plugins. This proposal does not add another control system. It completes those existing features so users can directly define how the main Agent works, when it uses helper Agents, and which tools each helper may use.

### Draft author's original wording

> DeepSeek has two clear weaknesses: weak instruction following and excessive reasoning.
>
> To harness it, even a fine horse needs a good saddle.

## Decision

### Visual global prompt configuration

Hermes provides global prompt configuration. It serves a role similar to Codex's `AGENTS.md`: it provides persistent user instructions to every project, but users view and edit it directly in Settings instead of managing prompt files.

The global prompt records how the user wants Agents to work in every project. Examples include answering before executing, reading user-provided material first, delegating external research to `researcher`, and stopping when searches add no new information.

Settings provides editing, preview, reset, and enable controls. After saving, the current session and new sessions read the latest prompt from the next model request; users do not need to reopen a session.

### Clearer multi-Agent configuration

Agent settings contain one global main Agent, four built-in helper Agents, and user-created Agents.

#### Global main Agent

The global main Agent has its own prompt configuration. It understands the request, decides whether helpers are needed, combines their results, and answers the user.

Its system prompt identifies the built-in helpers, their responsibilities, when to use them, and which work remains with the main Agent. The main Agent should not repeat research or project reading already completed by a helper.

#### Four built-in helper Agents

The four helpers use the same configuration structure as ordinary Agents. Users may change their prompts, models, and tool permissions or restore defaults, but cannot delete them:

- `researcher`: retrieves external information;
- `project-explorer`: performs read-only inspection of project code, documentation, and history;
- `reviewer`: checks whether a result follows the user's request;
- `agent-manager`: proposes Agent, prompt, and tool-permission configuration.

`researcher` contains one research standard: read user-provided material first, prefer official sources, and make every search answer an unresolved question. It stops when the question is answered, the available material is sufficient, or consecutive searches add no useful information. When the main Agent needs external information, it delegates research to `researcher` by default and uses the organized result.

`agent-manager` may create or edit a draft Agent configuration, but the user confirms the actual creation of an Agent or any change to prompts or tool permissions.

#### Create and manage Agents

Users can create ordinary Agents in the same interface and configure their name, purpose, prompt, model, tool permissions, and whether they may delegate again. The interface shows built-in and user-created Agents together while clearly distinguishing them.

### Project prompt configuration

Each project can define its own prompt for project rules, technical requirements, working methods, and verification requirements.

By default, a project uses both the global prompt and the project prompt. Users may select “Exclude global prompt” so the project uses only its project prompt. This option excludes only the user-configured global prompt, not system rules that Hermes must retain.

Before each model request, Hermes reads the latest global prompt, project prompt, and Agent configuration. When configuration changes, Hermes records the new configuration in the session log and marks it as replacing the earlier configuration.

### Complete the plugin list information

The plugin list must show more than plugin names and enabled state. Each plugin also shows:

- its purpose;
- the features and tools it provides;
- what it reads, changes, or sends;
- whether it requires network access or credentials;
- which Agents may use it;
- whether it is currently available and, if not, why;
- a link to detailed documentation.

Plugin descriptions use direct, readable language so users and Agents can understand when a plugin is appropriate. Tool permissions in Agent configuration refer to the same plugin information instead of presenting opaque plugin names.

## Alternatives considered

Each of the following approaches improves part of the problem but is incomplete on its own.

**Add only a longer system prompt.** Users would still lack direct management of global, project, and per-Agent prompts and could not clearly manage tool permissions.

**Add only more helper Agents.** Without defined responsibilities, prompts, and tool permissions, more Agents would add duplicate work instead of stopping excessive research.

**Continue storing prompts only in project files.** Ordinary users would still lack a Settings interface they can read and edit directly, and global rules would be repeated in every project.

**Add new core model tools.** The two problems come from incomplete prompts, Agent responsibilities, and plugin descriptions. Completing the existing features addresses them without expanding the core tool list.

## Verification

- Settings provides a global prompt that users can edit, preview, enable, and reset.
- Settings provides one global main Agent, four non-deletable built-in helper Agents, and an entry point for creating ordinary Agents.
- The main Agent's system prompt identifies the four built-in helpers, their responsibilities, and when to use them.
- Each Agent has separate prompt, model, and tool-permission configuration. User-created Agents also configure whether further delegation is allowed.
- `researcher` follows one research standard and stops when the question is answered, the material is sufficient, or consecutive searches add no useful information.
- A project can use global and project prompts together or explicitly exclude the user-configured global prompt.
- The plugin list shows purpose, features, read and write behavior, network and credential requirements, Agent access, runtime state, failure reason, and documentation.
- Configuration changes apply to current and new sessions from the next model request; the session log preserves each configuration actually used.
- Tests cover global-prompt inheritance, the project exclusion option, non-deletable built-in Agents, tool permissions, research stopping, and live configuration updates.

## Consequences

- Global and project prompts can conflict. The interface states exactly what the project exclusion option removes, and the model-visible snapshot records the final combination.
- Four built-in helpers add content to Agent settings. The interface shows their names and purposes first and expands detailed configuration on demand.
- The main Agent can still choose not to delegate. Its current snapshot names each helper and assigns external research to `researcher`; real-session snapshots pin that instruction.
- `researcher` can stop too early. Its default prompt requires the sources found, missing information, and stop reason, and the user can explicitly request more research.
- Plugin details are derived from package metadata and explicit runtime classification. A failed Cordis Fiber exposes only a direct instruction to inspect the Host log because Cordis keeps the recorded error private.
