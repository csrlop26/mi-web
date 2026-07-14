import OrganicParticles from './OrganicParticles';

// Smooth gradient + drifting particles that dissolve the hero into the next
// (solid black) section — replaces the earlier wave shape, which read as a
// flat, lifeless line rather than an actual curve.
export default function HeroBlend() {
  return (
    <div className="absolute bottom-0 left-0 w-full h-[220px] sm:h-[300px] overflow-hidden pointer-events-none select-none z-[1]">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,9,0.55) 55%, #0A0A09 100%)' }}
      />
      <OrganicParticles />
    </div>
  );
}
