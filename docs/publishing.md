# Publishing the extension (VSIX)

This repository includes a GitHub Actions workflow that can package and publish the extension to the Visual Studio Code Marketplace when a release is created.

What the workflow expects

- A repository secret named `VSCE_TOKEN` containing a published token for the VS Code Marketplace. You can create a publisher token using `vsce` or the marketplace web UI. See the steps below.

Create a publisher token (recommended)

1. Install vsce locally: `npm i -g vsce` (or use `npx vsce`).
2. Authenticate with your publisher and create a Personal Access Token (PAT) or publisher token following the VS Code Marketplace docs.
3. Copy the token value.
4. In your GitHub repo, go to Settings → Secrets and create a new repository secret named `VSCE_TOKEN` with that token value.

Triggering publish

- Create a GitHub Release (Draft → Publish) on the repo. When a release is published, the `publish.yml` workflow will run and attempt to package and publish the VSIX using the `VSCE_TOKEN` secret.

Local packaging

To create a VSIX locally:

```bash
npm run compile
npx vsce package
```

Notes

- The workflow deliberately fails if `VSCE_TOKEN` is missing to avoid a silently skipped publish. Set the secret before creating the release.
- If you prefer an action that publishes only on specific tags or from a release branch, edit `.github/workflows/publish.yml` accordingly.
