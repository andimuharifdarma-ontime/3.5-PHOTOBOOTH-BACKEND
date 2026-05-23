'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, ArrowBigUp as ShiftIcon, Space, X, ArrowLeft } from 'lucide-react';

interface VirtualKeyboardProps {
    onPress: (key: string) => void;
    onClose: () => void;
    layoutType?: 'text' | 'email' | 'tel';
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onPress, onClose, layoutType = 'text' }) => {
    const [isShift, setIsShift] = useState(false);
    const [mode, setMode] = useState<'abc' | 'symbol'>('abc');

    const layouts = {
        text: {
            abc: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
                ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACKSPACE'],
                ['?123', 'SPACE', '.', 'DONE']
            ],
            symbol: [
                ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
                ['_', '\\', '|', '~', '<', '>', '$', '&', '·', '•'],
                ['(', ')', '@', '"', ':', ';', '!', '?', '\''],
                ['ABC', ',', '/', '-', '_', ',', '.', 'BACKSPACE'],
                ['ABC', 'SPACE', '.', 'DONE']
            ]
        },
        email: {
            abc: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
                ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '.', 'BACKSPACE'],
                ['?123', 'SPACE', '_', 'DONE']
            ],
            symbol: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['@', '#', '$', '_', '&', '-', '+', '(', ')', '/'],
                ['*', '"', '\'', ':', ';', '!', '?', '\\', '|'],
                ['ABC', '~', '`', '<', '>', '{', '}', '[', ']', 'BACKSPACE'],
                ['ABC', 'SPACE', '.', 'DONE']
            ]
        },
        tel: {
            abc: [
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['-', '0', 'BACKSPACE'],
                ['DONE']
            ],
            symbol: [] // Not used for tel
        }
    };

    const currentLayouts = layouts[layoutType] || layouts.text;
    const currentLayout = (layoutType === 'tel' || mode === 'abc') ? currentLayouts.abc : currentLayouts.symbol;

    const handleKeyClick = (key: string) => {
        if (key === 'SHIFT') {
            setIsShift(!isShift);
        } else if (key === 'DONE') {
            onClose();
        } else if (key === '?123') {
            setMode('symbol');
        } else if (key === 'ABC') {
            setMode('abc');
        } else {
            let output = key;
            if (key === 'SPACE') output = ' ';
            if (key === 'BACKSPACE') output = 'BACKSPACE';

            if (isShift && output.length === 1) {
                output = output.toUpperCase();
            }

            onPress(output);
            if (isShift) setIsShift(false);
        }
    };

    const renderKey = (key: string, idx: number) => {
        let content: React.ReactNode = key;
        let className = "relative flex items-center justify-center p-4 rounded-sm transition-all duration-100 active:scale-95 shadow-sm font-medium ";

        // Dynamic styles based on key type
        if (key === 'SHIFT') {
            content = <ShiftIcon className={`w-5 h-5 ${isShift ? 'text-white' : 'text-[#A68B67]'}`} />;
            className += isShift ? "bg-[#A68B67] text-white flex-[1.5]" : "bg-white border border-[#EAE1D3] text-[#A68B67] flex-[1.5]";
        } else if (key === 'BACKSPACE') {
            content = <Delete className="w-5 h-5" />;
            className += "bg-white border border-[#EAE1D3] text-[#A68B67] flex-[1.5]";
        } else if (key === 'SPACE') {
            content = "SPACE";
            className += "bg-white border border-[#EAE1D3] text-[#A68B67] flex-[3]";
        } else if (key === 'DONE') {
            content = "SELESAI";
            className += "bg-[#4A3F35] text-white flex-[2] font-bold";
        } else if (key === '?123' || key === 'ABC') {
            content = key;
            className += "bg-[#F5F1EA] border border-[#EAE1D3] text-[#A68B67] flex-[1.5] text-xs font-bold";
        } else {
            content = isShift ? key.toUpperCase() : key;
            className += "bg-white border border-[#EAE1D3] text-[#4A3F35] hover:border-[#A68B67] flex-1";
        }

        return (
            <button
                key={`${key}-${idx}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleKeyClick(key);
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                className={className}
            >
                {content}
            </button>
        );
    };

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-[#FDFBF7] border-t-2 border-[#A68B67]/30 shadow-[0_-10px_40px_rgba(74,63,53,0.15)] p-4 md:p-6"
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss from input
        >
            <div className="max-w-4xl mx-auto space-y-2">
                {/* Keyboard Header */}
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] font-black text-[#A68B67] uppercase tracking-[0.2em]">Virtual Keyboard</span>
                    <button onClick={onClose} className="p-1 text-[#4A3F35]/40 hover:text-[#4A3F35]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Keyboard Layout */}
                {currentLayout.map((row, i) => (
                    <div key={i} className="flex gap-2">
                        {row.map((key, kIdx) => renderKey(key, kIdx))}
                    </div>
                ))}
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-4"></div>
        </motion.div>
    );
};

export default VirtualKeyboard;
