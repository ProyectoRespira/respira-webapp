import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { loadingStations, stations, type STATION } from "../../../store/map";

type NavDropdownProps = {
  title: string;
  baseRoute: string;
};

const SkeletonItem = () => (
  <li className="py-2 animate-pulse">
    <div className="h-4 w-32 bg-basedark rounded mb-1" />
    <div className="h-3 w-24 bg-basedark rounded" />
  </li>
);

const NavDropdown = ({ title, baseRoute }: NavDropdownProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const data = useStore(stations);
  const loading = useStore(loadingStations);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative group">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-row items-center gap-1 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <h6 className="font-serif font-bold text-[1rem] text-black text-start select-none m-auto">
          {title}
        </h6>
        <svg
          className={`h-6 w-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={`
          md:absolute md:top-8 left-0 z-50
          bg-base md:p-6 pt-2 md:pt-0 rounded min-w-48 md:shadow-lg
          overflow-y-auto nav-dropdown-list
          transition-all duration-200 ease-in-out
          ${
            open
              ? "max-h-72 opacity-100 pointer-events-auto"
              : "max-h-0 opacity-0 pointer-events-none md:overflow-hidden"
          }
        `}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        role="listbox"
        aria-label={`${title} stations`}
      >
        <ul className="flex flex-col divide-y divide-basedark/30">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonItem key={i} />)
            : data?.map((station: STATION) => (
                <li key={station.id} className="py-2" role="option">
                  <a
                    href={`${baseRoute}/${station.id}`}
                    onClick={() => setOpen(false)}
                    className="block hover:opacity-70 transition-opacity"
                  >
                    <p className="font-serif font-bold text-[1rem] text-black">
                      Estación {station.id}
                    </p>
                    <p className="font-sans text-[0.75rem] text-black">
                      {station.name}
                    </p>
                  </a>
                </li>
              ))}
        </ul>
      </div>
    </div>
  );
};

export { NavDropdown };
