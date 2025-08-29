# Fondation CLI Documentation

Welcome to the official documentation for the Fondation CLI. This guide provides everything you need to know to install, configure, and use the tool effectively.

--- 

## 👥 Choose Your Path

### For End Users
If you're using Fondation as an installed CLI tool:

- [**End User Guide**](./end-user-guide.md) - Complete guide for using the CLI
- [**Installation Guide**](./installation.md) - How to install via npm
- [**Quick Start**](./quick-start.md) - Essential commands to get started

### For Developers
If you're contributing to or running Fondation from source:

- [**Developer Guide**](./developer-guide.md) - Development setup, workflow, and architecture
- [**Contributing**](../CONTRIBUTING.md) - How to contribute

---

## reference

In-depth information on specific features.

- [**Commands Reference**](./commands-reference.md) - A detailed breakdown of every command and its options.
- [**Flags Reference**](./flags-reference.md) - A complete guide to all global and command-specific flags.
- [**Configuration**](./configuration.md) - Advanced setup using configuration files (`.fondation.json`).
- [**Profiles Guide**](./profiles-guide.md) - How to use configuration profiles for different contexts (e.g., `production`, `test`).

---

## 🆘 Help

- [**Troubleshooting**](./troubleshooting.md) - Solutions to common problems and error messages.
- [**End User Guide**](./end-user-guide.md) - Comprehensive guide for CLI users.
- [**Developer Guide**](./developer-guide.md) - Guide for contributors and developers.

---

## 🚀 Quick Navigation

### **Most Used Commands**

```bash
# Basic prompt execution
fondation run "Your prompt here"

# Clean output (no tools shown)
fondation run "Your prompt" --quiet

# Full debugging with thinking process
fondation run "Your prompt" --verbose --thinking

# JSON output for automation
fondation run "Your prompt" --json --quiet
```

### **Essential Flags**

- `--quiet` - Minimal output, perfect for scripts.
- `--verbose` - Maximum output for debugging.
- `--thinking` - Show Claude's reasoning process.
- `--json` - Get structured JSON output for automation.
- `--profile <name>` - Use a pre-configured profile (e.g., `debug`).

--- 

*This documentation is actively maintained. Please report any issues or suggestions.*