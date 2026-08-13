import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        {/* We use a generic image reference here. Ensure logo.png is in the public folder */}
        <img
          src="http://localhost:3000/logo.png"
          style={{ width: '110%', height: '110%', objectFit: 'contain' }}
          alt="Logo"
        />
      </div>
    ),
    { ...size }
  );
}
