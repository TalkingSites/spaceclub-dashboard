// Fixed star field behind the page. Positions come from a seeded generator so the
// server and browser render the same stars.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

export function Stars({ count = 50 }: { count?: number }) {
  const rand = seeded(42);
  const stars = Array.from({ length: count }, () => ({
    size: rand() * 3 + 1,
    top: rand() * 100,
    left: rand() * 100,
    duration: rand() * 5 + 3,
  }));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            top: `${s.top}%`,
            left: `${s.left}%`,
            ["--d" as string]: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
