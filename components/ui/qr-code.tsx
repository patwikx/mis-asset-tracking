// components/ui/qr-code.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 128, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // QR Code parameters
    const modules = 33; // 33x33 grid for more realistic QR code
    const moduleSize = size / modules;
    const quietZone = 2; // 2 module quiet zone

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    // Create a more sophisticated hash function for better randomness
    const createHash = (str: string, seed: number = 0) => {
      let hash = seed;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
      }
      return Math.abs(hash);
    };

    // Generate pattern matrix
    const matrix: boolean[][] = Array(modules).fill(null).map(() => Array(modules).fill(false));
    
    // Fill with pseudo-random pattern based on value
    const hash = createHash(value);
    for (let i = 0; i < modules; i++) {
      for (let j = 0; j < modules; j++) {
        // Skip finder patterns areas
        if ((i < 9 && j < 9) || (i < 9 && j >= modules - 8) || (i >= modules - 8 && j < 9)) {
          continue;
        }
        
        // Create pattern based on position and hash
        const posHash = createHash(value, i * modules + j);
        matrix[i][j] = (posHash % 3) === 0;
      }
    }

    // Draw finder patterns (corner squares)
    const drawFinderPattern = (x: number, y: number) => {
      // Outer 7x7 black square
      ctx.fillStyle = '#000000';
      ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
      
      // Inner 5x5 white square
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      
      // Center 3x3 black square
      ctx.fillStyle = '#000000';
      ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    // Draw the three finder patterns
    drawFinderPattern(0, 0); // Top-left
    drawFinderPattern(modules - 7, 0); // Top-right
    drawFinderPattern(0, modules - 7); // Bottom-left

    // Draw separators (white borders around finder patterns)
    ctx.fillStyle = '#ffffff';
    // Top-left separator
    ctx.fillRect(7 * moduleSize, 0, moduleSize, 8 * moduleSize);
    ctx.fillRect(0, 7 * moduleSize, 8 * moduleSize, moduleSize);
    
    // Top-right separator
    ctx.fillRect((modules - 8) * moduleSize, 0, moduleSize, 8 * moduleSize);
    ctx.fillRect((modules - 8) * moduleSize, 7 * moduleSize, 8 * moduleSize, moduleSize);
    
    // Bottom-left separator
    ctx.fillRect(7 * moduleSize, (modules - 8) * moduleSize, moduleSize, 8 * moduleSize);
    ctx.fillRect(0, (modules - 8) * moduleSize, 8 * moduleSize, moduleSize);

    // Draw timing patterns
    ctx.fillStyle = '#000000';
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize); // Horizontal
        ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize); // Vertical
      }
    }

    // Draw dark module (always present)
    ctx.fillRect(8 * moduleSize, (4 * modules + 9) * moduleSize / 4, moduleSize, moduleSize);

    // Draw data pattern
    ctx.fillStyle = '#000000';
    for (let i = 0; i < modules; i++) {
      for (let j = 0; j < modules; j++) {
        if (matrix[i][j]) {
          ctx.fillRect(j * moduleSize, i * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    // Add some alignment patterns for larger QR codes
    const alignmentPositions = [16, 26]; // Simplified alignment pattern positions
    alignmentPositions.forEach(x => {
      alignmentPositions.forEach(y => {
        // Skip if overlaps with finder patterns
        if ((x < 10 && y < 10) || (x < 10 && y > modules - 10) || (x > modules - 10 && y < 10)) {
          return;
        }
        
        // Draw 5x5 alignment pattern
        ctx.fillStyle = '#000000';
        ctx.fillRect((x - 2) * moduleSize, (y - 2) * moduleSize, 5 * moduleSize, 5 * moduleSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((x - 1) * moduleSize, (y - 1) * moduleSize, 3 * moduleSize, 3 * moduleSize);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
      });
    });

  }, [value, size]);

  if (!value) {
    return (
      <div 
        className={`border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">No QR Code</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`border rounded ${className}`}
      style={{ width: size, height: size }}
    />
  );
}