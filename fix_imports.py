import os
import re

mapping = {
    "engine": "$lib/core/engine",
    "assets": "$lib/core/assets",
    "input": "$lib/core/input",
    "vfx": "$lib/core/vfx",
    "audio-synthesis": "$lib/core/audio-synthesis",
    "ecs-miniplex": "$lib/core/ecs/ecs-miniplex",
    "entity-queries": "$lib/core/ecs/entity-queries",
    "movement": "$lib/core/systems/movement",
    "combat": "$lib/core/systems/combat",
    "enemy-ai": "$lib/core/systems/enemy-ai",
    "interaction-system": "$lib/core/systems/interaction-system",
    "map": "$lib/core/systems/map",
    "types": "$lib/core/types",
    "building": "$lib/domain/building",
    "building-specs": "$lib/domain/building-specs",
    "skill-xp": "$lib/domain/skill-xp",
    "inventory-api": "$lib/domain/inventory-api",
    "survival.svelte": "$lib/domain/survival.svelte",
    "stamina.svelte": "$lib/domain/stamina.svelte",
    "status-effects.svelte": "$lib/domain/status-effects.svelte",
    "crafting.svelte": "$lib/domain/crafting.svelte",
    "knowledge.svelte": "$lib/domain/knowledge.svelte",
    "quests.svelte": "$lib/domain/quests.svelte",
    "consume-actions": "$lib/domain/consume-actions",
    "game-events": "$lib/domain/game-events",
    "rpg-types": "$lib/domain/rpg-types",
    "interactions": "$lib/domain/interactions",
    "rpg-state.svelte": "$lib/state/rpg-state.svelte",
    "game-state.svelte": "$lib/state/game-state.svelte",
    "remote-sync": "$lib/state/persistence/remote-sync",
    "persistence": "$lib/state/persistence/remote-sync",
    "save-load": "$lib/state/persistence/save-load",
    "migrations": "$lib/state/persistence/migrations",
    "player-state": "$lib/state/persistence/player-state",
    "player-feedback": "$lib/ui/player-feedback",
    "dev-console": "$lib/ui/debug/dev-console",
    "dev-commands": "$lib/ui/debug/dev-commands",
    "coord-utils": "$lib/utils/coord-utils",
    "noise": "$lib/utils/noise",
    "colors": "$lib/utils/colors",
    "item-types": "$lib/domain/items/item-types",
    "item-definitions": "$lib/domain/items/item-definitions",
    "item-effects": "$lib/domain/items/item-effects",
    "item-registry": "$lib/domain/items/item-registry",
    "item-traits": "$lib/domain/items/item-traits",
    "item-builder": "$lib/domain/items/item-builder",
    "item-view": "$lib/domain/items/item-view",
    "status-types": "$lib/domain/systems/status-types",
    "inventory-system": "$lib/domain/systems/inventory-system",
    "item-reactions": "$lib/domain/systems/item-reactions",
    "exposure-context": "$lib/domain/exposure/exposure-context",
    "gather-risk": "$lib/domain/gathering/gather-risk",
    "gather-system": "$lib/domain/gathering/gather-system",
    "crafting-system": "$lib/domain/crafting/crafting-system",
    "recipes": "$lib/domain/crafting/recipes",
    "experimental": "$lib/domain/crafting/experimental"
}

subfolders = {
    "domain/crafting": "$lib/domain/crafting",
    "domain/gathering": "$lib/domain/gathering",
    "domain/items": "$lib/domain/items",
    "domain/systems": "$lib/domain/systems",
    "domain/knowledge": "$lib/domain/knowledge",
    "domain/exposure": "$lib/domain/exposure"
}

def resolve_path(relative_path, current_file_path):
    # Normalize path to use forward slashes for internal logic
    norm_path = relative_path.replace('\\', '/')
    parts = norm_path.split('/')
    filename = parts[-1]
    
    # Remove extensions if present for mapping lookup
    lookup_name = filename
    if lookup_name.endswith('.svelte.ts'):
        lookup_name = lookup_name.replace('.svelte.ts', '.svelte')
    elif lookup_name.endswith('.ts'):
        lookup_name = lookup_name[:-3]
    # .svelte stays as is
        
    if lookup_name in mapping:
        return mapping[lookup_name]
    
    # Handle subfolder patterns
    for sub, target in subfolders.items():
        if sub in norm_path:
            # Reconstruct the path relative to the subfolder
            sub_parts = norm_path.split(sub)
            return target + sub_parts[1]

    # Special case for items (often imported as "../items")
    if filename == "items" or filename == "..":
         if "../items" in norm_path:
             return "$lib/domain/items"

    # Best judgment for other src/lib paths
    if "app.css" in norm_path:
        return "$lib/../app.css"

    return None

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def replace_import(match):
        prefix = match.group(1)
        rel_path = match.group(2)
        suffix = match.group(3)
        
        # Only process relative imports (handle both slashes)
        if not (rel_path.startswith('./') or rel_path.startswith('../') or rel_path.startswith('.\\') or rel_path.startswith('..\\')):
            return match.group(0)
            
        print(f"Checking relative path: {rel_path} in {file_path}")
        new_path = resolve_path(rel_path, file_path)
        if new_path:
            print(f"  Found replacement: {new_path}")
            # Maintain .svelte extension if it was there
            if rel_path.endswith('.svelte') and not new_path.endswith('.svelte'):
                new_path += '.svelte'
            return f"{prefix}{new_path}{suffix}"
        
        print(f"  No replacement found for: {rel_path}")
        return match.group(0)

    # Regex for import/export from/import statements
    # Group 1: prefix (up to quote)
    # Group 2: path
    # Group 3: suffix (quote onwards)
    pattern = r'((?:import|export|from)\s+[\'"])(.*?)(\'")'
    new_content = re.sub(pattern, replace_import, content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
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
                    print(f"Updated: {full_path}")
                    count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
