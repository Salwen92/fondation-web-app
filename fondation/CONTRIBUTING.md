# Contributing to Fondation

Thank you for your interest in contributing to Fondation! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment:
   ```bash
   bun install
   bun run setup
   ```

## Development Process

1. Create a feature branch from `main`
2. Make your changes following our code style
3. Write tests for new features
4. Ensure all tests pass: `bun run test`
5. Run linting: `bun run lint`
6. Submit a pull request

## Code Style

- We use Biome for linting and formatting
- Run `bun run format:write` before committing
- Follow TypeScript best practices
- Write meaningful commit messages

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure CI passes
4. Request review from maintainers
5. Address review feedback promptly

## Testing

- Unit tests: `bun run test`
- Integration tests: `bun run test:integration`
- E2E tests: `bun run e2e:test`

## Questions?

Open an issue or discussion on GitHub for any questions.

## License

By contributing to Fondation, you agree that your contributions become the property of Fondation and will be subject to Fondation's proprietary license. Contributors may be required to sign a Contributor License Agreement (CLA).