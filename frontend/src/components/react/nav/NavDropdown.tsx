import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";

import { loadingStations, stations } from "../../../store/map";
import type { DynamicMenuItem } from "../../../data/menu";
import type { STATION } from "../../../store/map";
import DropdownIcon from "../../../assets/icons/dropdown_icon.svg?react";

type NavDropdownProps = DynamicMenuItem & {
  title: string;
};

const NavDropdown = ({
  title,
  baseRoute,
  titleKey,
  subtitleKey,
}: NavDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const data = useStore(stations);
  const loading = useStore(loadingStations);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        className="flex flex-row items-center gap-1 cursor-default"
      >
        <h6 className="font-serif font-bold text-[1rem] text-black text-start select-none">
          {title}
        </h6>
        <DropdownIcon
          className={`h-6 w-auto transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-2 md:mt-0 md:absolute md:top-10 md:left-0 bg-base md:p-3 pt-2 rounded-xl w-64 max-w-[78vw] z-50 shadow-xl border border-basedark/20">
          <ul className="flex flex-col gap-1 max-h-[min(24rem,calc(100vh-9rem))] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0">
            {loading && (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-10 w-full bg-basedark rounded"></div>
                <div className="h-10 w-full bg-basedark rounded"></div>
                <div className="h-10 w-full bg-basedark rounded"></div>
              </div>
            )}
            {!loading &&
              data &&
              data.map((val: STATION) => {
                const valueMap = val as Record<string, unknown>;
                return (
                  <li
                    key={val.id}
                    className="rounded-lg px-3 py-2 hover:bg-basedark/10 transition-colors duration-150"
                  >
                    <a href={baseRoute + "/" + val.id} className="block">
                      <p className="font-serif font-bold text-[1rem] text-black leading-tight">
                        Estación {String(valueMap[titleKey] ?? "")}
                      </p>
                      <p className="font-sans text-[0.75rem] text-black/70 leading-snug mt-1">
                        {String(valueMap[subtitleKey] ?? "")}
                      </p>
                    </a>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
};

export { NavDropdown };
