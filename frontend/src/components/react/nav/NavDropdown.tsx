import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";

import { loadingStations, stations } from "../../../store/map";
import type { DynamicMenuItem } from "../../../data/menu";
import type { STATION } from "../../../store/map";
import DropdownIcon from "../../../assets/icons/dropdown_icon.svg?react";

type NavDropdownProps = DynamicMenuItem & {
  title: string;
};

const NavDropdown = ({ title, baseRoute, titleKey, subtitleKey }: NavDropdownProps) => {
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
        className="flex flex-row items-center cursor-default"
      >
        <h6 className="font-serif font-bold text-[1rem] text-black text-start select-none">
          {title}
        </h6>
        <DropdownIcon className="h-6 w-auto" aria-hidden="true" />
      </button>

      {open && (
        <div className="md:absolute md:top-8 bg-base md:p-6 pt-2 md:pt-0 rounded min-w-36 z-50">
          <ul className="flex flex-col">
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
                  <li key={val.id} className="py-2">
                    <a href={baseRoute + "/" + val.id}>
                      <p className="font-serif font-bold text-[1rem] text-black">
                        Estación {String(valueMap[titleKey] ?? "")}
                      </p>
                      <p className="font-sans text-[0.75rem] text-black">
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
