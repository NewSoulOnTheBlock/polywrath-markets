'use client';

export function BackgroundVideo() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover opacity-25"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/60 to-gray-950/90" />
    </div>
  );
}
