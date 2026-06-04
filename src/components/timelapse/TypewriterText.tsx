export default function TypewriterText({ text, className }: { text: string; speed?: number; className?: string; delay?: number }) {
  return <span className={className}>{text}</span>;
}
