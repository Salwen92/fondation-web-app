# Installation Guide

This guide covers how to install and authenticate with the `@fondation-io/fondation` CLI, which is a private package hosted on GitHub Packages.

## Prerequisites

- You must be a member of the [Fondation-io GitHub organization](https://github.com/Fondation-io).
- You need a GitHub Personal Access Token (PAT) with the correct permissions.

## Step 1: Create a GitHub Personal Access Token

To download the package, you need a PAT with the `read:packages` scope.

1.  Go to your GitHub Developer Settings: **[Create a new token](https://github.com/settings/tokens?type=beta)**.
2.  Click **Generate new token**.
3.  Give it a descriptive name (e.g., `fondation-cli-read`).
4.  Set an expiration date (90 days is a good default).
5.  Under **Repository access**, select "Only select repositories" and choose `Fondation-io/fondation`.
6.  Under **Permissions**, expand "Repository permissions" and find **Packages**. Change its access level to **Read-only**.
7.  Click **Generate token**.
8.  **Important**: Copy the token immediately. You will not be able to see it again.

## Step 2: Configure npm Authentication

You need to tell npm how to authenticate with the GitHub Packages registry.

#### Option A: Local Project Configuration (Recommended)

This method is recommended as it configures authentication only for the current project by creating a `.npmrc` file in your project's root directory.

In your terminal, run the following command, replacing `YOUR_TOKEN_HERE` with the token you just copied.

```bash
echo "@fondation-io:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE" > .npmrc
```

Now your project is configured. You can commit this `.npmrc` file safely as it does **not** contain your secret token.

#### Option B: Global Configuration (for CI/CD or Power Users)

You can configure this globally in your user profile. **Warning**: This will use the same token for all projects.

1.  Open or create the file `~/.npmrc` in your home directory.
2.  Add the following lines, replacing `YOUR_TOKEN_HERE` with your token:

```
@fondation-io:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

## Step 3: Install the CLI

Once authentication is configured, you can install the package using `npm`.

#### For Local Project Usage (Most Common)

Install the CLI as a development dependency in your project.

```bash
# Install the latest beta version (recommended)
npm install --save-dev @fondation-io/fondation@beta

# Install a specific beta version
npm install --save-dev @fondation-io/fondation@1.0.0-beta.2

# Install the latest stable version (when available)
npm install --save-dev @fondation-io/fondation@latest
```

You can then run the CLI using `npx` or by adding it to your `package.json` scripts.

```bash
# Run with npx
npx fondation --help

# Or run directly
npx fondation run "Your prompt here"

# Add to package.json scripts
# "scripts": {
#   "fondation": "fondation",
#   "query": "fondation run"
# }
```

#### For Global Usage

You can also install the CLI globally to make the `fondation` command available everywhere.

```bash
# Install latest beta version globally
npm install -g @fondation-io/fondation@beta

# Or install a specific beta version
npm install -g @fondation-io/fondation@1.0.0-beta.2
```

Now you can run the command directly:
```bash
fondation --help
fondation run "Your prompt here"
```

## Troubleshooting

### Common Installation Issues

#### "No matching version found" or "404 Not Found"
This typically means your authentication isn't set up correctly. Make sure:
1. Your `.npmrc` file is in the right location (project root or `~/.npmrc` for global)
2. Your GitHub token has the `read:packages` permission
3. You're a member of the Fondation-io organization

#### "Package not found" for dependencies
If you see errors about `@anthropic-ai/claude-code` not being found, make sure your `.npmrc` only scopes the GitHub registry to `@fondation-io` packages:

```
@fondation-io:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

#### Beta versions not available
Beta versions are published automatically from the `beta` branch. If a beta version seems missing, check the [GitHub Actions](https://github.com/Fondation-io/fondation/actions) to see if the latest build completed successfully.
