# AI_USAGE

## Tools used
- GitHub Copilot,opencode,kilo code Chat (VS Code,) for:
  - Requirement gap analysis
  - Drafting infrastructure files (Docker Compose, Dockerfiles)
  - Generating test scaffolding and refactor suggestions
  - Drafting project documentation templates

## Areas where AI assisted
1. API contract alignment checklist against assignment requirements
2. Backend hold/cancel flow adjustments
3. Frontend polling and session-restore update draft
4. Initial xUnit test structure and concurrency test outline

## Manual verification and corrections
- Reviewed generated API changes to ensure route compatibility and header enforcement.
- Manually validated business rules around hold expiry and cancellation semantics.
- Manually checked container config (ports, env vars, volumes, service dependencies).
- Manually adjusted test assertions to match actual domain behavior and status transitions.
- Ran build/lint/test commands after changes and corrected compile/runtime issues.
