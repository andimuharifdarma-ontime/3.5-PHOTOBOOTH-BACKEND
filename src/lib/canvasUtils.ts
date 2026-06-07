export const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

export const applySlotTransformAndClip = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    rotation: number = 0, 
    borderRadiusPercent: number = 0,
    defaultRadius: number = 10
) => {
    // Apply Rotation
    if (rotation) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
    }

    // Apply Border Radius
    let radius = defaultRadius;
    if (borderRadiusPercent > 0) {
        const minDim = Math.min(width, height);
        radius = (borderRadiusPercent / 100) * (minDim / 2);
    }

    // Fallback protection against negative or oversized radius
    const maxAllowedRadius = Math.min(width / 2, height / 2);
    radius = Math.min(Math.max(0, radius), maxAllowedRadius);

    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
};
