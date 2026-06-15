import { AnimatedSprite, Container, Graphics, Text, TextStyle, type Texture } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { type VFXResource, triggerCameraShake } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { gatherSoundId } from "$lib/audio/sound-manifest";
import { Colors } from "$lib/utils/colors";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import type { ParticleFXKey } from "$lib/core/assets/assets";

export function handleHitFeedbackSystem(
  entity: Entity,
  yieldName: string,
  quantity: number,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  getParticleFXFrames: (key: ParticleFXKey) => Texture[],
  _getWoodItemTexture: () => Texture,
): void {
  const gatherable = entity.resource?.gatherableId ? getGatherableDefinition(entity.resource.gatherableId) : undefined;
  const isTree = gatherable?.solidKind === "tree";

  const hitPos = entity.position
    ? { x: entity.position.x + TILE / 2, y: entity.position.y + TILE / 2 }
    : undefined;
  playSound(gatherSoundId(gatherable?.gatherSound), hitPos ? { position: hitPos } : {});

  const sprite = entitySprites.get(entity.id);
  if (sprite && entity.position) {
    if (!vfx.baseScales.has(entity.id)) {
      vfx.baseScales.set(entity.id, { x: Math.abs(sprite.scale.x), y: sprite.scale.y });
    }

    sprite.scale.y = sprite.scale.y * 0.82;
    sprite.scale.x = sprite.scale.x * 1.18;

    vfx.activeShakes.set(entity.id, { duration: 0.22, time: 0, xOffset: 0 });
    triggerCameraShake(vfx, 2.5, 0.1);

    // Hit flash
    const oldFlash = vfx.hitFlashes.get(entity.id);
    if (oldFlash) {
      entityLayer.removeChild(oldFlash.graphic);
      oldFlash.graphic.destroy();
    }
    const flashG = new Graphics();
    flashG.rect(-TILE * 0.45, -TILE, TILE * 0.9, TILE).fill({ color: Colors.vfx.hitFlash, alpha: 0.55 });
    flashG.blendMode = "add";
    flashG.x = entity.position.x + TILE / 2;
    flashG.y = entity.position.y + TILE;
    entityLayer.addChild(flashG);
    vfx.hitFlashes.set(entity.id, { graphic: flashG, timer: 0.08 });

    // Floating text
    const contactX = entity.position.x + TILE / 2;
    const contactY = entity.position.y + TILE * 0.5;

    const isSuper = quantity > 1;
    const textStyle = new TextStyle({
      fontFamily: ["monospace", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "sans-serif"],
      fontSize: isSuper ? 22 : 15,
      fontWeight: "bold",
      fill: isSuper ? Colors.resource.superText : isTree ? Colors.resource.wood : Colors.resource.ore,
      stroke: { color: Colors.ui.stroke, width: isSuper ? 4 : 3 },
    });
    const textObj = new Text({ text: `+${quantity} ${yieldName}`, style: textStyle });
    textObj.anchor.set(0.5, 0.5);
    textObj.x = contactX + (isSuper ? (Math.random() - 0.5) * 10 : 0);
    textObj.y = entity.position.y - 12;

    vfx.floatingTexts.push({
      textObj,
      stackKey: `node:${entity.id}`,
      baseX: textObj.x,
      baseY: textObj.y,
      life: 0,
      maxLife: isSuper ? 1.1 : 0.9,
    });
    entityLayer.addChild(textObj);

    // Sprite particle puffs
    const fxFrames = getParticleFXFrames(isTree ? "dust1" : "dust2");
    const fxCount = isSuper ? 4 : 2;
    for (let i = 0; i < fxCount; i++) {
      const ps = new AnimatedSprite(fxFrames);
      ps.animationSpeed = 0.18 + Math.random() * 0.12;
      ps.loop = false;
      ps.play();
      ps.anchor.set(0.5, 0.5);
      ps.scale.set(0.28 + Math.random() * 0.2);
      ps.x = contactX + (Math.random() - 0.5) * 20;
      ps.y = contactY + (Math.random() - 0.5) * 14;
      const angle = (Math.random() - 0.5) * Math.PI * 0.8 - Math.PI / 2;
      const spd = 30 + Math.random() * 50;
      vfx.spriteParticles.push({
        sprite: ps,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 120,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.22,
      });
      entityLayer.addChild(ps);
    }

    // Debris graphic particles
    let particleColor: number = isTree ? Colors.particle.woodDebris : Colors.particle.oreDebris;
    let isSpark = false;
    let isFlake = false;
    let isStar = false;

    if (!isTree) {
      const lowerYield = yieldName.toLowerCase();
      if (lowerYield.includes("copper")) {
        particleColor = 0xf97316;
        isSpark = true;
      } else if (lowerYield.includes("iron")) {
        particleColor = 0x475569;
        isFlake = true;
      } else if (lowerYield.includes("silver")) {
        particleColor = 0xe2e8f0;
        isStar = true;
      }
    }

    const pCount = isSuper ? 24 : 12;
    for (let i = 0; i < pCount; i++) {
      const g = new Graphics();
      if (isTree) {
        g.rect(-2.5, -1.5, 5, 3).fill(particleColor);
      } else if (isSpark) {
        g.moveTo(-3, 0);
        g.lineTo(0, -2);
        g.lineTo(3, 0);
        g.lineTo(0, 2);
        g.closePath();
        g.fill(particleColor);
      } else if (isFlake) {
        g.rect(-2, -2, 4, 3).fill(particleColor);
      } else if (isStar) {
        g.moveTo(0, -4);
        g.lineTo(1, -1);
        g.lineTo(4, 0);
        g.lineTo(1, 1);
        g.lineTo(0, 4);
        g.lineTo(-1, 1);
        g.lineTo(-4, 0);
        g.lineTo(-1, -1);
        g.closePath();
        g.fill(particleColor);
      } else {
        g.circle(0, 0, 2).fill(particleColor);
      }
      g.x = contactX + (Math.random() - 0.5) * 12;
      g.y = contactY + (Math.random() - 0.5) * 12;

      const angle = (Math.random() - 0.5) * Math.PI * 0.6 - Math.PI / 2;
      const speed = 70 + Math.random() * 110;
      vfx.particles.push({
        graphic: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 280,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
      });
      entityLayer.addChild(g);
    }
  }
}
