# Contributing to CloudGenesis

Thank you for considering a contribution! This guide keeps contributions consistent and reviewable.

## Ground rules
- Use Conventional Commits (feat, fix, chore, docs, refactor).
- Keep PRs small and focused; include tests and docs when applicable.
- Run linters/tests before pushing.
- Follow the Code of Conduct.

## How to contribute
1. Fork the repo and create a feature branch: `git checkout -b feat/<short-desc>`.
2. Implement your change with accompanying tests and docs.
3. Run checks (see `ci/test.yml` guidance).
4. Submit a PR. Fill the template with context, testing evidence, and risk notes.
5. A maintainer and CodeRabbit must approve before merge.

## Development environment
- Python 3.11+, Node 18+.
- Optional: Docker, kind, localstack.
- Install deps per `requirements.txt` (placeholder) and `ui/package.json` when available.

## Issues and discussions
- Use issue templates for bugs and features.
- Propose substantial design changes in a discussion or an RFC under `docs/`.

## CodeRabbit Review Guidelines

All pull requests are automatically reviewed by [CodeRabbit](https://coderabbit.ai), our AI-powered code review assistant. Here's how to work with CodeRabbit effectively:

### How It Works
1. **Automatic Review**: When you open a PR, CodeRabbit automatically analyzes your changes and posts review comments.
2. **IaC Validation**: For Terraform/infrastructure changes, CodeRabbit checks for security issues, best practices, and validation errors.
3. **Merge Blocking**: PRs with critical IaC validation failures will be blocked from merging until issues are resolved.

### Interacting with CodeRabbit
- **Ask Questions**: Reply to any CodeRabbit comment with `@coderabbitai` to get clarification.
- **Request Re-review**: After making changes, comment `@coderabbitai review` to trigger a fresh review.
- **Dismiss Suggestions**: If a suggestion doesn't apply, explain why in a reply—this helps the bot learn.
- **Generate Summaries**: Use `@coderabbitai summary` to get an overview of large PRs.

### Addressing Feedback
1. **Critical Issues** (🔴): Must be fixed before merge. These typically involve security vulnerabilities, breaking changes, or validation failures.
2. **Suggestions** (🟡): Recommended improvements. Address these when possible, or explain why they don't apply.
3. **Nitpicks** (🟢): Minor style/code quality suggestions. Nice to fix but not blocking.

### IaC-Specific Reviews
For infrastructure changes, CodeRabbit validates:
- Terraform syntax and formatting (`terraform fmt`, `terraform validate`)
- Security best practices via `tfsec`
- Linting rules via `TFLint`
- Cost and resource implications

### Merge Requirements
A PR can only be merged when:
- [ ] CodeRabbit review is complete
- [ ] All critical issues are resolved
- [ ] IaC validation passes (for infrastructure changes)
- [ ] At least one maintainer approves

