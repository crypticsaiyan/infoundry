# Pull Request

## Description
Refactor MCP server to align with Kestra workflow, resulting in exactly 9 tools: ingest_repo, ingest_telemetry, propose_architecture, render_graph, generate_iac, validate_iac, create_pr, validate_pr, and evaluate. This change also fixes Terraform templates to use proper multi-line HCL format, updates the create_pr tool to accept both JSON string and object for the files parameter, corrects the Oumi API call endpoint, adds support for GitHub URLs in ingest_repo, includes an mcp.json.example for Cline configuration, and adds a test-all-tools.mjs file for comprehensive testing. The non-functional cline-architect.yml workflow has been removed, and the README has been updated with documentation for the new 9-step workflow.

## Type of Change
- [x] ✨ New feature (non-breaking change that adds functionality)
- [x] ♻️ Refactor (no functional changes)
- [x] 📚 Documentation update

## Related Issues
Closes #

## Changes Made
- Refactored MCP server to include 9 tools aligned with the Kestra pipeline.
- Fixed Terraform templates to use proper multi-line HCL format.
- Updated create_pr tool to accept both JSON string and object for the files parameter.
- Corrected Oumi API call to use the /v1/chat/completions endpoint.
- Added support for GitHub URLs to the ingest_repo tool.
- Included mcp.json.example for Cline configuration.
- Added test-all-tools.mjs for testing all 9 workflow steps.
- Removed the non-functional cline-architect.yml workflow.
- Updated README with documentation for the 9-step workflow.

## Infrastructure Changes (if applicable)
- [x] Terraform files modified

### IaC Details

terraform plan output or summary here


## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing completed
- [x] IaC validation (`terraform validate`) passes

### Test Evidence
<!-- Include screenshots, logs, or commands run -->

## Checklist
- [x] My code follows the project's coding standards
- [x] I have performed a self-review of my code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings or errors
- [x] I have added tests that prove my fix/feature works
- [x] New and existing unit tests pass locally
- [x] Any dependent changes have been merged and published

## CodeRabbit Review
- [ ] I have addressed all CodeRabbit suggestions
- [ ] Critical security/performance issues resolved
- [ ] IaC best practices followed (for infrastructure changes)

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Additional Notes
<!-- Any additional information reviewers should know -->

---
*This PR will be automatically reviewed by [CodeRabbit](https://coderabbit.ai) 🐰*