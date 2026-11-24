import type { NavIcon as NavIconName } from "./nav-items";

const paths: Record<NavIconName, string> = {
  today: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  study: "M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3zM18 8h2v12M8 9h6M8 13h6",
  words: "M4 6h16M4 12h16M4 18h10",
  library: "M5 4h4v16H5zM10 4h4v16h-4zM15 5l3.5-1 3 15.5-3.5 1z",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}
