import os
import re

# Comprehensive mapping of filenames to their new $lib aliases
mapping = {
    # Core
    "engine.ts": "$lib/core/engine",
    "assets.ts": "$lib/core/assets",
    "input.ts": "$lib/core/input",
    "vfx.ts": "$lib/core/vfx",
    "audio-synthesis.ts": "$lib/core/audio-synthesis",
    "ecs-miniplex.ts": "$lib/core/ecs/ecs-miniplex",
    "entity-queries.ts": "$lib/core/ecs/entity-queries",
    "movement.ts": "$lib/core/systems/movement",
    "combat.ts": "$lib/core/systems/combat",
    "enemy-ai.ts": "$lib/core/systems/enemy-ai",
    "interaction-system.ts": "$lib/core/systems/interaction-system",
    "map.ts": "$lib/core/systems/map",
    "types.ts": "$lib/core/types",
    
    # Domain
    "building.ts": "$lib/domain/building",
    "building-specs.ts": "$lib/domain/building-specs",
    "skill-xp.ts": "$lib/domain/skill-xp",
    "inventory-api.ts": "$lib/domain/inventory-api",
    "survival.svelte.ts": "$lib/domain/survival.svelte",
    "stamina.svelte.ts": "$lib/domain/stamina.svelte",
    "status-effects.svelte.ts": "$lib/domain/status-effects.svelte",
    "crafting.svelte.ts": "$lib/domain/crafting.svelte",
    "knowledge.svelte.ts": "$lib/domain/knowledge.svelte",
    "quests.svelte.ts": "$lib/domain/quests.svelte",
    "consume-actions.ts": "$lib/domain/consume-actions",
    "game-events.ts": "$lib/domain/game-events",
    "rpg-types.ts": "$lib/domain/rpg-types",
    "interactions.ts": "$lib/domain/interactions",
    
    # State
    "rpg-state.svelte.ts": "$lib/state/rpg-state.svelte",
    "game-state.svelte.ts": "$lib/state/game-state.svelte",
    "remote-sync.ts": "$lib/state/persistence/remote-sync",
    "save-load.ts": "$lib/state/persistence/save-load",
    "migrations.ts": "$lib/state/persistence/migrations",
    "player-state.ts": "$lib/state/persistence/player-state",
    
    # UI
    "player-feedback.ts": "$lib/ui/player-feedback",
    "dev-console.ts": "$lib/ui/debug/dev-console",
    "dev-commands.ts": "$lib/ui/debug/dev-commands",
    
    # Utils
    "coord-utils.ts": "$lib/utils/coord-utils",
    "noise.ts": "$lib/utils/noise",
    "colors.ts": "$lib/utils/colors"
}

# Domain Subdirectories
domain_subs = {
    "items": "$lib/domain/items",
    "systems": "$lib/domain/systems",
    "gathering": "$lib/domain/gathering",
    "crafting": "$lib/domain/crafting",
    "knowledge": "$lib/domain/knowledge",
    "exposure": "$lib/domain/exposure"
}

def resolve_new_path(rel_path, current_file):
    # Normalize for Windows/Unix
    rel_path = rel_path.replace('\\', '/')
    
    # Strip extensions for matching
    base_rel = rel_path.split('/')[-1]
    
    # Try direct mapping first (with and without extension)
    for ext in ['.ts', '.svelte', '.svelte.ts']:
        if base_rel + ext in mapping:
            return mapping[base_rel + ext]
        if base_rel.endswith(ext) and base_rel in mapping:
             return mapping[base_rel]
    
    if base_rel in mapping:
        return mapping[base_rel]
    
    # Handle domain subfolders specifically
    for sub, alias in domain_subs.items():
        if f"/{sub}/" in rel_path or rel_path.endswith(f"/{sub}"):
            # Reconstruct the path after the subfolder
            parts = rel_path.split(f"/{sub}")
            if len(parts) > 1:
                return alias + parts[1]
            return alias

    # Handle app.css
    if "app.css" in rel_path:
        return "$lib/../app.css"

    return None

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    modified = False
    
    # Look for imports/exports
    # pattern: from "..." or import "..."
    import_re = re.compile(r'(from|import)\s+[\'"](\.\.?/.*?)[\'"]')
    
    for line in lines:
        match = import_re.search(line)
        if match:
            rel_path = match.group(2)
            new_path = resolve_new_path(rel_path, file_path)
            if new_path:
                # Preserve .svelte if it was there
                if rel_path.endswith('.svelte') and not new_path.endswith('.svelte'):
                    new_path += '.svelte'
                
                line = line.replace(rel_path, new_path)
                modified = True
        new_lines.append(line)

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        return True
    return False

def main():
    src_dir = 'src'
    count = 0
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.ts', '.svelte', '.svelte.ts')):
                full_path = os.path.join(root, file)
                if process_file(full_path):
                    count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
