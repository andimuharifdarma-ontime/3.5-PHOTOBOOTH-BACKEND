import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  value, 
  size = 200,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (value && canvasRef.current) {
      // Pastikan value adalah URL lengkap yang bisa dibuka di browser
      let urlValue = value;
      
      // Jika tidak diawali dengan http:// atau https://, tambahkan
      if (!urlValue.startsWith('http://') && !urlValue.startsWith('https://')) {
        // Jika dimulai dengan /, tambahkan origin dengan protocol
        if (urlValue.startsWith('/')) {
          urlValue = `${window.location.protocol}//${window.location.host}${urlValue}`;
        } else if (typeof window !== 'undefined') {
          // Jika tidak, tambahkan origin dan /
          urlValue = `${window.location.protocol}//${window.location.host}/${urlValue}`;
        }
      }
      
      QRCode.toCanvas(canvasRef.current, urlValue, {
        width: size,
        margin: 2,
        color: {
          dark: '#71604b', // Primary color
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M' // Level koreksi error untuk QR code
      }).catch((err) => {
        console.error('QR Code generation error:', err);
      });
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default QRCodeGenerator;