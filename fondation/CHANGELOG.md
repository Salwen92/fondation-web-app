# Changelog

All notable changes to the Fondation project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Strategy Pattern implementation for CLI execution
- Environment Configuration Singleton for centralized environment detection
- Configuration Builder Pattern for better configuration management
- Progress Parser unification
- Docker authentication via environment variables
- Parallel build support for faster compilation
- Integration test support scripts

### Changed
- Migrated from interactive Docker authentication to environment variable approach
- Moved docker-compose files to project root (best practice)
- Standardized on Bun package manager throughout
- Optimized package.json scripts for better performance
- Improved documentation structure and organization

### Fixed
- Docker authentication issues in production
- CLI execution profile naming consistency
- TypeScript compilation errors in config.ts
- Docker prompt path resolution issues
- Documentation inconsistencies

### Removed
- Prettier (using Biome exclusively)
- Redundant Docker authentication methods
- Unnecessary temporary documentation files

## [1.0.0-beta.9] - 2024-01-01

### Added
- Initial beta release
- Core analysis pipeline (6-step process)
- Web interface with Next.js 15
- Worker service with Docker support
- Claude AI integration
- Real-time progress tracking
- GitHub OAuth authentication

### Known Issues
- Docker authentication requires environment variables
- Some placeholder content in documentation

## [0.1.0] - 2023-12-01

### Added
- Project initialization
- Basic monorepo structure
- Initial documentation