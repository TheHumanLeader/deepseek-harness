# Agent Note: Governed global agent hierarchy

Status: proposed

English | [中文](2026-08-14-governed-global-agent-hierarchy.zh.md)

## Problem

The harness can compose different agents from per-session presets, constrain in-process children with a persona, visible-tool filter, and depth limit, and load global plus project instructions. Those mechanisms decide what a model sees, but they do not represent who may grant authority, which phase the user authorized, or how work by a parent and all descendants shares one resource budget. The existing subagent composition decision explicitly says that tool visibility is not authority.

That gap produces two user-visible failures. First, a model can weaken a phase constraint such as “estimate first” into permission to implement; one observed turn performed nine mutating actions before the user corrected it. Second, the same model chooses whether more reasoning or retrieval is useful and whether it may spend another request; one observed pricing task issued 45 searches, including 14 after the user supplied the official source, and ended only after interruption.

Prompt wording alone cannot close either class. The model that misread the instruction would also be the component deciding whether it complied, and a child asked to police its own tools could widen or reinterpret the policy it is meant to enforce. A durable design needs a single root owner, project-scoped constraints, system-owned child roles, and deterministic authorization outside every model.

## Proposal

Add a governed hierarchy that reuses agent presets, scoped registries, project instruction discovery, subagent providers, approval, and tool interception. It introduces no new core model tool. One global main-agent profile owns delegation and final user communication; project policy narrows that profile for a workspace; a non-deletable system catalog defines four adjustable child roles; and a host-side governor enforces phase, authority, and aggregate budgets for the complete delegation tree.

### Global main-agent management

The deployment ships one distinguished `main` profile backed by the existing agent-preset composition. A user may select a different model, reasoning effort, prompt overlay, budgets, and enabled capability groups through a global settings overlay, and may reset every field to the shipped value. The shipped profile id and recovery copy cannot be deleted or renamed.

The main agent owns task interpretation, the current phase, decomposition, delegation, synthesis, implementation, verification coordination, and the final response. It may ask a system child for bounded work, but it remains accountable for the result and may not treat a child report as new user authorization.

Every accepted user turn creates a structured turn contract before the first side effect. The contract records the requested deliverable, current phase (`analyze`, `propose`, `execute`, or `verify`), prohibited effects, source requirements, budgets, and completion conditions. A model may narrow the contract. Only a user action or a deployment policy fixed before the turn may widen it. “Analyze”, “estimate”, “review”, and equivalent proposal-only requests therefore cannot become execution leases because the model decided implementation would be helpful.

The stable baseline prompt states only the hierarchy and phase invariants. Detailed research, review, and policy procedures belong to their system child profiles, while tool-specific guidance stays with the owning tool packages. A baseline or preset edit applies to a new session; it never rebuilds the system-prompt prefix of a running conversation.

### Project constraints on the global main agent

A workspace contributes a project policy overlay beside the existing committed and local instruction files. It can select an allowed main preset, narrow tool capability classes, restrict external domains, declare source priorities, set branch and worktree rules, define project budgets, and name required verification. It cannot grant a capability or budget prohibited by the system or global user policy.

Resolution follows one monotonic order:

1. System invariants define non-bypassable behavior and the shipped recovery profiles.
2. Global user policy chooses defaults and may narrow deployment authority.
3. Project policy narrows the agent for one workspace.
4. The turn contract narrows authority for one user request.
5. A delegation grant narrows authority for one child run.

Each lower layer may remove authority but cannot add authority absent from every higher layer. The effective policy is recorded with the session and inherited by descendants as a snapshot, so a project edit or parent switch does not retroactively change a running child. Project instructions remain model-visible guidance; project policy is separately parsed, validated, and enforced, so prose in a repository cannot silently rewrite the governor.

### System-level child-agent management

The deployment ships a catalog of system child profiles with stable ids. A profile can be tuned through overlays—model, reasoning effort, persona extension, tool capability subset, budgets, source policy, and output schema—but its shipped definition remains available for reset and its id cannot be deleted. A project may disable delegation to a role or narrow it further, but cannot replace a system role with a more privileged profile under the same id.

The main agent selects and invokes roles; it does not edit their definitions during a turn. The governor creates a signed delegation grant containing the role id, parent identity, task, permitted capability classes, remaining tree budget, maximum depth, and required output shape. Child agents cannot approve requests, modify their grant, change the baseline prompt, edit plugin policy, or create another child unless their system role explicitly permits delegation.

Four system roles are the minimum sufficient default:

- `researcher` performs external retrieval under a read-only, network-budgeted grant and returns a compact evidence packet with claims, sources, unresolved fields, confidence, usage, and stop reason.
- `project-explorer` inspects local project structure, code, documentation, and history without mutation and returns a scoped project map or evidence packet; separating it from external research gives local and network work different authority and stop rules.
- `reviewer` independently checks a proposed plan, patch, or verification result against the turn contract and project policy; it reports findings but cannot repair them unless a later user-authorized execution task grants that work.
- `policy-steward` inspects baseline prompts, presets, plugin descriptors, and effective permissions and proposes configuration patches; it cannot apply its own proposal, and accepted baseline changes take effect only in new sessions.

Planner and builder are not default children because planning, construction, and final accountability belong to the main agent. A dedicated cost estimator is not a fifth role because pricing evidence is research and arithmetic synthesis belongs to the main agent. Additional specialist roles remain ordinary user or project profiles rather than permanent system surface.

### Governed retrieval

External retrieval is delegated to `researcher` whenever that role is available. The main agent sends a research brief containing the question, required fields, user-provided sources, source priority, call and time budgets, and stop conditions. It does not send an open-ended request to “search until complete.”

The researcher reads user-provided sources first, prefers primary official material, and associates every new query with an unresolved field. It maintains an evidence ledger and stops when the required fields are satisfied, the budget is exhausted, an authoritative source establishes the answer, or two consecutive retrievals add no new source, claim, or required field. Missing evidence produces an explicit unresolved item; it never authorizes another budget automatically.

All network-capable retrieval tools consume one grant budget. Changing tool names, query text, plugins, parallel branches, or child sessions does not reset it. The parent receives the evidence packet rather than the child’s complete retrieval transcript, keeping the parent context compact and preventing a second ungoverned search pass.

### Deterministic governor

A host-side policy plugin owns authority and budget state. It checks agent creation, subagent start, model-step admission, and tool pre-execution through existing extension points. The governor is not a subagent and no model can unload, reconfigure, or bypass it from inside a turn.

Tool and plugin definitions gain host-only capability descriptors rather than more model-visible schema: effect class (`local-read`, `network-read`, `local-write`, `external-write`, or `execute-install`), whether the operation may incur provider cost, credential requirements, concurrency behavior, and whether it can delegate. The governor compares those descriptors with the effective grant at execution time. A new plugin therefore enters the same policy automatically instead of relying on a tool-name denylist.

Budgets cover the root turn and every descendant: model steps, network operations, mutations, elapsed time, and provider usage where usage is available. Request counts remain the fail-closed fallback when a provider omits token or price data. Parallel reservations occur before execution so siblings cannot oversubscribe the remainder. Exhaustion ends with a durable blocked or awaiting-user state; only the user can grant an extension.

### Plugin information and permission management

Every user-facing plugin declares one authoritative descriptor used by configuration reference generation, settings UI, agent inspection, and governance. It includes purpose, supplied tools or services, effect and cost classes, network and credential requirements, eligible agent roles, prompt or tool-schema footprint, configuration owner, failure behavior, and documentation links.

The Plugins settings page separates user capabilities, governance policies, and internal infrastructure. Cards show configured and runtime status, effective role access, missing requirements, and why a plugin is unavailable. Internal rows such as loaders and registries remain inspectable but are collapsed by default rather than presented as equivalent to user capabilities.

The policy steward may propose prompt, preset, descriptor, and role-permission patches. The user reviews a diff and applies it through the existing privileged configuration path. No child can grant itself plugin access, and an accepted change does not mutate an active conversation’s system prompt or tool roster.

### Relationship to existing decisions

This proposal extends rather than supersedes the existing decisions. [Per-session agent presets](../../implemented/architecture/2026-08-03-per-session-agent-presets.md) remain the composition mechanism; [child preset joining](../../implemented/bug-fix/2026-08-10-child-agents-join-their-parent-preset.md) remains the inheritance mechanism; [subagent persona, tool visibility, and depth](../../implemented/feature/2026-07-12-subagent-persona-tool-filter-and-depth.md) remain composition controls; and [delegated approvals pinned to never](../../implemented/feature/2026-08-10-subagent-approval-pinned-never.md) remains fail-closed until a parent-routed approval design replaces it. The governor supplies the separate authority representation that the composition-controls note explicitly leaves out.

[Prompt ownership](../../implemented/architecture/2026-07-05-prompt-variables-and-tool-guidance-ownership.md), [local instruction overlays](../../implemented/feature/2026-07-21-local-instruction-overlay.md), [layered skills](../../implemented/architecture/2026-08-09-layered-skill-registry.md), and [Plugin settings tabs](../../implemented/architecture/2026-08-11-plugin-settings-tabs.md) keep their current ownership. The new hierarchy adds validated policy and richer descriptors without turning prompt prose, project files, or settings presentation into authority.

## Alternatives considered

**Strengthen only the main system prompt.** Rejected because the model that violated a phase or stop condition would still judge its own compliance, and detailed rules would enlarge every cached prefix without enforcing a failed decision.

**Give the main agent direct retrieval with a per-tool call cap.** Rejected because another network tool or plugin bypasses a name-specific limit, and the main transcript still absorbs the retrieval loop. A tree-wide capability budget and a bounded researcher solve the behavior class.

**Let a policy subagent control prompts and permissions directly.** Rejected because a model must not grant its own authority, untrusted retrieved content could influence the control plane, and mid-conversation prompt or toolset mutation breaks cache and replay invariants. The policy steward proposes; the deterministic governor and user decide.

**Ship more than four system child roles.** Rejected because planner, builder, tester, cost estimator, documentation writer, and other narrow roles either duplicate the main agent or are project-specific specializations. Four roles separate the authority classes that require distinct grants without making the permanent catalog a task taxonomy.

**Create a second agent-profile system instead of using presets.** Rejected because presets already own per-session tool and prompt composition, standing mounts, UI selection, durable identity, and child joining. Governance should add authority and overlays, not duplicate composition.

## Acceptance criteria

- Global settings expose one recoverable main profile and four recoverable system child profiles; users can adjust overlays and reset them but cannot delete or impersonate shipped ids.
- A project policy can narrow global behavior, and a turn or child grant can narrow it again; no lower layer can widen authority.
- Proposal-only requests produce no mutation, installation, external write, or execution even when a model attempts one through a new plugin, shell command, nested child, or alternate tool name.
- External research uses a structured brief and evidence packet, consumes one aggregate network budget across tools and descendants, honors user-provided sources first, and stops on completion, saturation, or exhaustion without user interruption.
- The main agent receives compact child results, owns implementation and final communication, and cannot treat a child output as user authorization.
- The policy steward can generate a reviewable patch but cannot apply it or change an active session’s prompt, preset, plugin permissions, or budget.
- Plugin settings distinguish capabilities, governance, and infrastructure and show purpose, effects, cost, credentials, role eligibility, runtime status, and failure behavior from one descriptor source.
- Existing preset, scope, project-instruction, skill, approval, session-replay, and prompt-cache invariants remain covered by unit, real-composition, and keyless nested-agent tests.

## Risks

- Mandatory research delegation adds startup latency for small factual questions. The main agent may answer from supplied context or stable internal knowledge when no external retrieval is needed, and deployments may disable the researcher while retaining the governor.
- Four permanent roles create documentation and compatibility obligations. Stable ids plus recoverable shipped definitions trade that cost for predictable global management; specialist roles stay outside the system catalog.
- Capability descriptors can be wrong. Validation must fail closed for undeclared effectful plugins, and integration tests must exercise execution-time enforcement rather than only manifest rendering.
- Natural-language phase classification remains probabilistic. The safe default for an ambiguous turn is proposal-only or user confirmation; the governor guarantees that a model cannot silently widen the resulting contract, not that every initial classification is perfect.
- Aggregate budgets can stop legitimate long work. The blocked state must explain the exhausted dimension and let the user extend it explicitly without resetting completed evidence or granting unrelated authority.
