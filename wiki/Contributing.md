# Contributing

Thank you for your interest in contributing to ResumeForge!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow the [Setup Guide](Setup-Guide)
4. Create a feature branch

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates

### Making Changes

1. **Backend changes**: Edit files in `firebase-functions/functions/`
2. **Extension changes**: Edit files in `extension/src/`
3. **Build extension**: `cd extension && npm run build`
4. **Test locally** before submitting

### Code Style

- Use ES6+ syntax
- Prefer `async/await` over callbacks
- Add JSDoc comments to public functions
- Keep functions focused and single-purpose

## Pull Request Process

1. Ensure your code builds without errors
2. Test your changes thoroughly
3. Update documentation if needed
4. Create a PR with a clear description
5. Wait for review

## Reporting Issues

When reporting bugs, include:

- Browser and extension version
- Steps to reproduce
- Expected vs actual behavior
- Console logs if available

## Security Vulnerabilities

For security issues, please email directly rather than creating a public issue.

---

*Questions? Open a GitHub Discussion!*
