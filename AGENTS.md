# Agent Instructions

## Release And Publish Flow

When publishing a new `chatbot-page` package version, use the GitHub Actions CI flow. Do not run `npm publish` manually from a local shell, and do not ask for an npm OTP for this package.

The publish workflow lives in `.github/workflows/publish.yml` and is triggered by tags matching `v*.*.*`. It verifies that the tag version matches `packages/chatbot-page/package.json`, runs the repo CI checks, and publishes to npm.

Use this sequence for releases:

1. Check the registry version with `npm view chatbot-page version`.
2. Bump `packages/chatbot-page/package.json` to the next patch/minor/major version requested.
3. Run `corepack pnpm@10.0.0 run ci` from the repo root.
4. Commit the release changes.
5. Push `main`.
6. Create and push the matching tag, for example `git tag v1.0.4 && git push origin v1.0.4`.
7. Verify the publish with `npm view chatbot-page version gitHead --json`.

If another app needs to consume the new package version, update that app only after npm reports the new version.
