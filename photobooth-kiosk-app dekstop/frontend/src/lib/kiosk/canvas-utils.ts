export const applySlotTransformAndClip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
  borderRadius: number,
  clipOffset: number = 0
) => {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  ctx.beginPath();
  const rx = x + clipOffset;
  const ry = y + clipOffset;
  const rw = w - clipOffset * 2;
  const rh = h - clipOffset * 2;
  const r = borderRadius;

  ctx.moveTo(rx + r, ry);
  ctx.lineTo(rx + rw - r, ry);
  ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
  ctx.lineTo(rx + rw, ry + rh - r);
  ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
  ctx.lineTo(rx + r, ry + rh);
  ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
  ctx.lineTo(rx, ry + r);
  ctx.quadraticCurveTo(rx, ry, rx + r, ry);
  ctx.closePath();
  ctx.clip();
};
