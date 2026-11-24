<!-- forge:begin (managed by `forge install`; edit outside this block) -->
## FORGE engineering harness

FORGE installed these project instructions. Prefer evidence over assumption: never claim a check passed unless it was run.

### Always-on rules

- **Agents** — How agents should collaborate, delegate and stay within scope (`.forge/harness/rules/common/agents.md`)
- **Coding Style** — General code style: clarity, small units, explicit errors (`.forge/harness/rules/common/coding-style.md`)
- **Documentation** — Keep docs accurate when behavior changes (`.forge/harness/rules/common/documentation.md`)
- **Evidence First** — Evidence-first reporting for every agent action (`.forge/harness/rules/common/evidence.md`)
- **Git** — Commit and branch hygiene (`.forge/harness/rules/common/git.md`)
- **Performance** — Performance hygiene and measurement (`.forge/harness/rules/common/performance.md`)
- **Security** — Baseline security rules for code and agent configuration (`.forge/harness/rules/common/security.md`)
- **Testing** — Testing expectations for every behavior change (`.forge/harness/rules/common/testing.md`)

### Language rules (read before editing matching files)

- react: **React** [**/*.tsx, **/*.jsx] — `.forge/harness/rules/react/react-style.md`
- typescript: **Node.js** [**/*.ts, **/*.js, **/*.mjs] — `.forge/harness/rules/typescript/node-runtime.md`
- typescript: **TypeScript** [**/*.ts, **/*.tsx, **/*.mts, **/*.cts] — `.forge/harness/rules/typescript/typescript-style.md`
- typescript: **TypeScript Testing** [**/*.test.ts, **/*.spec.ts, **/*.test.tsx, **/*.spec.tsx] — `.forge/harness/rules/typescript/typescript-testing.md`

### Specialist roles

When a task matches a role, read `.forge/harness/agents/<role>.md` and follow it.

- **api-designer**: Designs and reviews HTTP/RPC APIs
- **architect**: Evaluates module boundaries, interfaces and trade-offs
- **build-error-resolver**: Fixes failing builds, type errors and lint failures with the smallest…
- **ci-security-reviewer**: Reviews CI/CD workflows for token scope, unpinned actions, dangerous…
- **code-reviewer**: Reviews changes for correctness, security, data integrity, performance…
- **context-optimizer**: Reduces what agents load every session
- **database-reviewer**: Reviews schemas, queries, indexes and migrations for correctness…
- **debugger**: Traces defects from symptom to root cause with hypotheses, evidence…
- **dependency-auditor**: Audits dependencies for vulnerabilities, licenses, maintenance health…
- **documentation-writer**: Keeps README, guides and API docs accurate to verified behavior, with…
- **loop-operator**: Runs and supervises verified agent loops and races
- **mcp-builder**: Designs, builds and tests MCP servers
- **performance-engineer**: Finds measurable performance bottlenecks in algorithms, I/O, rendering…
- **planner**: Turns a goal into a sequenced, reviewable implementation plan with…
- **refactor-cleaner**: Removes dead code, duplication and needless complexity without…
- **release-manager**: Prepares release readiness
- **security-reviewer**: Reviews trust boundaries, auth, secrets, injection and unsafe defaults
- **tdd-guide**: Drives changes test-first

### Workflows

Run a workflow by reading `.forge/harness/commands/<name>.md`: `api-design`, `build-fix`, `checkpoint`, `code-review`, `consult`, `context-budget`, `cost`, `deps-audit`, `evolve`, `explain`, `guard`, `handoff`, `instincts`, `learn`, `loop`, `mcp-sync`, `plan`, `race`, `refactor-clean`, `release-check`, `review-pr`, `scorecard`, `security-review`, `security-scan`, `shield`, `spec`, `tdd`, `test-coverage`, `update-docs`, `verify`.

### Skills (in `.agents/skills`, load when relevant)

- **forge-agent-workflow-design**: Design reliable agent workflows
- **forge-api-design**: Design consistent, versionable HTTP/RPC APIs with validated inputs and…
- **forge-architecture-decision-records**: Record significant technical decisions as short ADRs with context…
- **forge-auth-and-sessions**: Implement or review authentication, sessions, tokens and password…
- **forge-background-jobs**: Write reliable background jobs and queue consumers
- **forge-caching-strategies**: Add caching (HTTP, CDN, in-process, Redis) with correct keys, TTLs…
- **forge-code-review-checklist**: Systematic review checklist for correctness, security, data…
- **forge-codebase-onboarding**: Get productive in an unfamiliar repository quickly
- **forge-context-budget**: Keep agent context small and relevant to save tokens and improve…
- **forge-continuous-learning**: Capture verified lessons and decisions into FORGE memory so future…
- **forge-debugging**: Hypothesis-driven debugging from reproduction to regression test
- **forge-dependency-upgrades**: Upgrade dependencies safely with changelog review and staged…
- **forge-error-handling**: Handle, propagate and report errors so failures are visible and…
- **forge-feature-flag-rollouts**: Ship risky changes behind feature flags with staged rollout, kill…
- **forge-flaky-tests**: Find and fix flaky tests
- **forge-git-workflow**: Small focused commits, conventional messages and clean pull requests
- **forge-git-worktrees**: Run parallel agents and experiments safely with git worktrees
- **forge-github-actions-hardening**: Harden GitHub Actions
- **forge-graphql-apis**: Design and change GraphQL schemas and resolvers
- **forge-implementation-planning**: Plan multi-file changes with ordered steps, acceptance criteria and…
- **forge-kubernetes-deploys**: Change Kubernetes manifests and Helm charts safely
- **forge-llm-app-engineering**: Build features on LLM APIs
- **forge-llm-evals**: Evaluate LLM features with datasets, graders and regression gates…
- **forge-mcp-server-development**: Build and ship an MCP server
- **forge-nextjs-app-router**: Build and debug Next.js App Router features
- **forge-node-api-services**: Build Node.js HTTP APIs (Express, Fastify, Hono, NestJS) with…
- **forge-payments-integration**: Integrate payments safely
- **forge-postgres-queries**: Write, index and migrate PostgreSQL safely
- **forge-prompt-injection-defense**: Keep agents safe from instructions hidden in files, web pages and tool…
- **forge-rag-pipelines**: Build retrieval-augmented generation that cites sources
- **forge-react-components**: Write React components and hooks
- **forge-redis-patterns**: Use Redis correctly for caching, rate limits, locks, queues and…
- **forge-refactoring-patterns**: Safe, behavior-preserving refactoring moves with a test safety net
- **forge-research-first**: Gather primary-source evidence before choosing an approach or dependency
- **forge-secrets-management**: Keep secrets out of code, logs and agent context
- **forge-secure-changes**: Apply least privilege, validate input and protect secrets in every…
- **forge-security-review**: Threat-model and review a change for exploitable vulnerabilities
- **forge-spec-driven-development**: Turn requirements into a written spec with acceptance tests before…
- **forge-strategic-compaction**: Manage long agent sessions
- **forge-supply-chain-security**: Reduce dependency risk
- **forge-tdd-workflow**: Test-driven development cycle with observed red and green evidence
- **forge-terraform-changes**: Plan and review Terraform/OpenTofu changes safely
- **forge-typescript-strict**: Write and refactor TypeScript under strict compiler settings without…
- **forge-verification-loop**: Choose, run and report proportionate checks
- **forge-web-performance**: Improve Core Web Vitals (LCP, INP, CLS) with measurement first
<!-- forge:end -->
