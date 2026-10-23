# skills

Agent skills by kfchou. Each skill lives in its own folder under [`skills/`](skills/)
with a `SKILL.md` and a README.

My wiki skills live separately in [kfchou/wiki-skills](https://github.com/kfchou/wiki-skills).

## Skills

| Skill | Description |
|---|---|
| [`interactive-markdown-review`](skills/interactive-markdown-review/README.md) | Edit prose with an agent over many passes: inline `<comments>` and `<<replies>>` in the file, or a visual review page in Lavish. |

## Install

With the [`skills`](https://www.npmjs.com/package/skills) CLI, which installs into
Claude Code, Codex, Cursor and other agents:

```sh
# into the current project
npx skills add kfchou/skills --skill interactive-markdown-review

# or for your user, across projects
npx skills add kfchou/skills --skill interactive-markdown-review -g
```

`npx skills add kfchou/skills --list` lists the skills available.

As a Claude Code plugin, one plugin per skill:

```sh
/plugin marketplace add kfchou/skills
/plugin install interactive-markdown-review@kfchou-skills
```

To uninstall the plugin:

```sh
/plugin uninstall interactive-markdown-review@kfchou-skills
/plugin marketplace remove kfchou-skills
```

## License

[MIT](LICENSE)
