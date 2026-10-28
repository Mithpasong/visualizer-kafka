const PALETTE = [
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { bg: 'bg-sky-500/20',     border: 'border-sky-500/50',     text: 'text-sky-300',     dot: 'bg-sky-400' },
  { bg: 'bg-violet-500/20',  border: 'border-violet-500/50',  text: 'text-violet-300',  dot: 'bg-violet-400' },
  { bg: 'bg-pink-500/20',    border: 'border-pink-500/50',    text: 'text-pink-300',    dot: 'bg-pink-400' },
  { bg: 'bg-amber-500/20',   border: 'border-amber-500/50',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  { bg: 'bg-cyan-500/20',    border: 'border-cyan-500/50',    text: 'text-cyan-300',    dot: 'bg-cyan-400' },
  { bg: 'bg-red-500/20',     border: 'border-red-500/50',     text: 'text-red-300',     dot: 'bg-red-400' },
  { bg: 'bg-lime-500/20',    border: 'border-lime-500/50',    text: 'text-lime-300',    dot: 'bg-lime-400' },
  { bg: 'bg-orange-500/20',  border: 'border-orange-500/50',  text: 'text-orange-300',  dot: 'bg-orange-400' },
  { bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/50', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
  { bg: 'bg-teal-500/20',    border: 'border-teal-500/50',    text: 'text-teal-300',    dot: 'bg-teal-400' },
  { bg: 'bg-indigo-500/20',  border: 'border-indigo-500/50',  text: 'text-indigo-300',  dot: 'bg-indigo-400' },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForTopic(name: string) {
  return PALETTE[hashString(name) % PALETTE.length];
}
