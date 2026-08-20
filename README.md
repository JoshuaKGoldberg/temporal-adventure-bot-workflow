<h1 align="center">Temporal Adventure Bot Workflow</h1>

<p align="center">A Vercel Workflow port of the choose-your-own-adventure Slack bot.</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="👪 All Contributors: 1" src="https://img.shields.io/badge/%F0%9F%91%AA_all_contributors-1-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com/getsentry/temporal-adventure-bot-workflow/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://codecov.io/gh/getsentry/temporal-adventure-bot-workflow" target="_blank"><img alt="🧪 Coverage" src="https://img.shields.io/codecov/c/github/getsentry/temporal-adventure-bot-workflow?label=%F0%9F%A7%AA%20coverage" /></a>
	<a href="https://github.com/getsentry/temporal-adventure-bot-workflow/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/%F0%9F%92%AA_typescript-strict-21bb42.svg" />
</p>

<p align="center">
	<img alt="Adventure Bot in Slack: pinned instructions for the game, then a prompt describing a farm in 18th century England with three numbered options and one emoji reaction vote on each" src="./docs/screenshot.webp" />
</p>

## Usage

A [Vercel Workflow](https://useworkflow.dev) port of [temporal-adventure-bot](https://github.com/JoshuaKGoldberg/temporal-adventure-bot).
The game logic is the same; durable execution comes from the Workflow DevKit instead of a Temporal server, so there's no worker process to keep alive.

### Installing the Slack App

1. Create the app from [`slack-manifest.json`](./slack-manifest.json): on [Slack API > Your Apps](https://api.slack.com/apps), choose **Create New App**, then **From a manifest**, then the workspace to install into, then paste the file's contents.

   The manifest points both slash commands at this project's deployed URLs.
   Change them if you deploy somewhere else, or to a tunnel if you're running locally.

2. Install the app to the workspace from its **Install App** settings.

   Workspaces often restrict who may install apps.
   If yours does, that button sends a request to a workspace admin instead of installing, and you'll need their approval before continuing.

3. Collect two credentials from the app's settings:

   | Value                  | Where                                                               |
   | ---------------------- | ------------------------------------------------------------------- |
   | `SLACK_BOT_TOKEN`      | **OAuth & Permissions** → _Bot User OAuth Token_, as `xoxb-...`     |
   | `SLACK_SIGNING_SECRET` | **Basic Information** → _App Credentials_ → _Signing Secret_ → Show |

4. Create the channel the game will play in, then invite the bot to it with `/invite @Adventure Bot`.

   Don't skip this: posting, reacting, reading reactions, and pinning all require membership, and skipping it is confusing to debug.

5. Copy that channel's _ID_ (such as `C0123456789`) for `SLACK_CHANNEL`.

   Click the channel's name and the ID is at the bottom of the **About** tab, or take the last segment of the channel's copied link.
   Its _name_ won't work: Slack's API answers `channel_not_found` for one.

6. Collect the Slack user IDs allowed to run `/force`, comma separated, for `SLACK_FORCE_USER_IDS`.

   Each person's profile has theirs under **⋮ More** → **Copy member ID**, such as `U0123456789,U9876543210`.
   `/force` ends a poll early and picks its outcome, so it's restricted to this allowlist.
   Slash commands are otherwise available to every member of a workspace.
   If the variable is unset, `/force` is refused for everyone rather than allowed for everyone.

The manifest asks for five bot scopes, and no more:

| Scope             | Why                                  |
| ----------------- | ------------------------------------ |
| `chat:write`      | Post prompts, reminders, and endings |
| `commands`        | Receive `/begin` and `/force`        |
| `pins:write`      | Pin the instructions once            |
| `reactions:read`  | Count votes on its own polls         |
| `reactions:write` | Seed one reaction per option         |

Notably absent is `channels:history`, so the bot cannot read messages.
It only ever sees reaction names and counts on the polls it posted itself.

### Running Locally

Put the credentials in a `.env`:

```shell
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL=C0123456789
SLACK_FORCE_USER_IDS=U0123456789,U9876543210
SLACK_SIGNING_SECRET=...
```

```shell
pnpm dev
```

Workflows use the [Local World](https://useworkflow.dev/docs/deploying/world/local-world) in development, storing runs in `.workflow-data/`.
Inspect them with `npx workflow inspect runs`.

Slack needs a public URL to deliver slash commands, so point the manifest's command URLs at a tunnel to `localhost:3000` while developing.
Treat that tunnel URL as a credential: outside the Vercel preset the Workflow DevKit also serves `/.well-known/workflow/v1/step` and `/flow`, and your `.env` holds a real bot token.
Keep tunnels short-lived and don't share them.

### Deploying to Vercel

Deployments use the [Vercel World](https://useworkflow.dev/docs/deploying/world/vercel-world) with no configuration: storage, queuing, and durable timers come from the platform.

```shell
vercel link
vercel env add SLACK_BOT_TOKEN production
vercel env add SLACK_CHANNEL production
vercel env add SLACK_FORCE_USER_IDS production
vercel env add SLACK_SIGNING_SECRET production
vercel deploy --prod
```

Each `vercel env add` prompts for the value, so paste it at the prompt rather than in the command and it stays out of your shell history.
`vercel env ls production` then confirms all four landed.
The project's [environment variables settings](https://vercel.com/sentry/temporal-adventure-bot-workflow/settings/environment-variables) do the same job in a browser, and can mark the token and signing secret _Sensitive_ so nobody can read them back out.

Four things worth knowing:

- Environment variable changes only apply to _new_ deployments, so redeploy after changing one.
- Deployment Protection blocks Slack's requests before they reach the app.
  Turn it off for production, or add a bypass secret and append `?x-vercel-protection-bypass=<secret>` to both command URLs.
  The bypass secret is the better option: with protection off, the signing secret is the only control on two public endpoints.
- One project serves one workspace, since `SLACK_CHANNEL` holds a single channel.
  Use a second project to run a test workspace alongside a real one.
- The app doesn't use Slack token rotation, so `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` don't expire on their own.
  Rotate both every 90 days, and immediately if either may have leaked: regenerate them in the app's settings, `vercel env rm` and re-add each, then redeploy.

Finally, point the slash commands at the deployment:

| Command  | Route    | What it does                                              |
| -------- | -------- | --------------------------------------------------------- |
| `/begin` | `/start` | Posts the instructions and opens the first poll           |
| `/force` | `/force` | Forces a choice: `random`, or `1` through the last option |

Both routes verify Slack's request signature, reject anything unsigned, and refuse commands sent from any channel other than `SLACK_CHANNEL`.
`/force` additionally requires the sending user to be in `SLACK_FORCE_USER_IDS`, and both routes log the invoking user and channel.
Only one game runs per channel at a time; a second `/begin` is turned away.

### How It Works

`runGame` is one long-lived durable workflow that loops over game entries.
For each entry it posts a poll, then races two outcomes:

- `sleep()` until the round's deadline, `settings.intervalMs` after it opened, after which it counts reactions and looks for consensus
- a hook keyed on the channel, which `/force` resumes to override the vote

Every Slack call lives in a `"use step"` function, so the workflow itself stays deterministic and replayable.

## Development

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md), then [`.github/DEVELOPMENT.md`](./.github/DEVELOPMENT.md).
Thanks! ✨

## Contributors

<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="http://www.joshuakgoldberg.com"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg ✨"/><br /><sub><b>Josh Goldberg ✨</b></sub></a><br /><a href="https://github.com/getsentry/temporal-adventure-bot-workflow/commits?author=JoshuaKGoldberg" title="Code">💻</a> <a href="#content-JoshuaKGoldberg" title="Content">🖋</a> <a href="https://github.com/getsentry/temporal-adventure-bot-workflow/commits?author=JoshuaKGoldberg" title="Documentation">📖</a> <a href="#ideas-JoshuaKGoldberg" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-JoshuaKGoldberg" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-JoshuaKGoldberg" title="Maintenance">🚧</a> <a href="#projectManagement-JoshuaKGoldberg" title="Project Management">📆</a> <a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->

> 💝 This package was templated with [`create-typescript-app`](https://github.com/JoshuaKGoldberg/create-typescript-app) using the [Bingo framework](https://create.bingo).
