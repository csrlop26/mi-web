interface AbstractLoopProps {
  className?: string;
}

// Original animated motif (rings + pulsing dot) — replaces the third-party
// stock video that used to hotlink another studio's asset.
export default function AbstractLoop({ className = '' }: AbstractLoopProps) {
  return (
    <div className={`relative overflow-hidden bg-[#141310] ${className}`}>
      <div className="abstract-loop-ring" />
      <div className="abstract-loop-ring abstract-loop-ring--reverse" />
      <div className="abstract-loop-dot" />
      <div className="g-grain-overlay" style={{ position: 'absolute', opacity: 0.1 }} />
    </div>
  );
}
