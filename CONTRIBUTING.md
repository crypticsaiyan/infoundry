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

