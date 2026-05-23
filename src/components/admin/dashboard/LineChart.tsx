'use client';

import { motion } from 'framer-motion';

interface LineChartProps {
    data: number[];
    color?: string;
}

export default function LineChart({ data, color = "#71604b" }: LineChartProps) {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const width = 200;
    const height = 60;
    const padding = 10;

    const points = data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `M ${padding},${height} L ${points} L ${width - padding},${height} Z`;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#gradient-${color})`} />
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                d={`M ${points}`}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {data.map((_, index) => {
                const x = padding + (index / (data.length - 1)) * (width - padding * 2);
                const y = height - padding - ((data[index] - min) / range) * (height - padding * 2);
                return (
                    <circle
                        key={index}
                        cx={x} cy={y}
                        r={index === data.length - 1 ? 4 : 0}
                        fill="#fff"
                        stroke={color}
                        strokeWidth="2"
                    />
                );
            })}
        </svg>
    );
}
