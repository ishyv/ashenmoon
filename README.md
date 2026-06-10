# ashenmoon 🌙✨

a silly RPG in construction, currently a chaotic mashup of every idea i can think of. it's a vibe tbh.



## the idea

we're building this with:
- **sveltekit** for the frontend (it's nice, i like it)
- **svelte 5 runes** because reactivity goes *boop*
- **tailwind + @hyvnt/hyvui** for that operator-adjacent dark mode aesthetic
- **pixi.js** for the game engine (canvas go fast)
- **mongodb** to store all our chaos
- **bun** because why not

## quick start (if you dare)

```bash
bun install
bun run dev              # dev server (ui-only, no bot bridge yet)
bun run build            # make the magic happen
bun run check            # type checking (keep it honest)
```

fair warning: half the features don't actually work yet. it's fine. this is a feature.

## the messy truth

this thing expects to live inside a discord bot's node process via an in-memory bridge. it's weird. it works. don't ask questions.


## license

[MIT](LICENSE) — © 2026 Hyvnt (who thought this was a good idea)
