export interface WorldVisualSizeSpec {
  /** Desired readable visual height in world tiles. */
  heightTiles?: number;
  /** Optional desired visual width in world tiles. */
  widthTiles?: number;
}

export interface TextureLikeSize {
  width: number;
  height: number;
}

export interface WorldVisualScale {
  x: number;
  y: number;
}

export function resolveWorldVisualScale(input: {
  readonly spec: WorldVisualSizeSpec;
  readonly texture: TextureLikeSize;
  readonly tilePx: number;
}): WorldVisualScale {
  const textureWidth = Math.max(1, input.texture.width);
  const textureHeight = Math.max(1, input.texture.height);
  const widthScale = input.spec.widthTiles !== undefined
    ? (input.spec.widthTiles * input.tilePx) / textureWidth
    : undefined;
  const heightScale = input.spec.heightTiles !== undefined
    ? (input.spec.heightTiles * input.tilePx) / textureHeight
    : undefined;

  if (widthScale !== undefined && heightScale !== undefined) {
    return { x: widthScale, y: heightScale };
  }
  const uniform = heightScale ?? widthScale ?? 1;
  return { x: uniform, y: uniform };
}
