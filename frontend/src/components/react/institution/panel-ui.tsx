// The panel's own surfaces, in the Dirección 4 look (#338): cream ground,
// white cards, near-black 2 px edges, Merriweather 900 headings and uppercase
// buttons.
//
// Kept apart from `../ui`, which the public sensor pages share: these are the
// private panel's identity, and restyling the shared atoms would change the
// public export too. The palette lives in Tailwind arbitrary values here
// rather than in `tailwind.config`, because nothing outside the panel uses it.

import type { ReactNode } from "react";

/** Near-black text and strong edges. */
export const INK = "#1B1B1A";

/**
 * A white card on the cream ground. `strong` adds the 2 px edge the design
 * reserves for the blocks that lead a page.
 */
export function PanelCard({
  children,
  className = "",
  strong = false,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`flex min-w-0 flex-col gap-3 rounded-[18px] bg-white p-5 md:p-6 ${
        strong ? "border-2 border-[#1B1B1A]" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelTitle({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="m-0 font-serif text-[20px] font-black leading-tight text-[#1B1B1A]"
    >
      {children}
    </h2>
  );
}

/** The small uppercase label above a figure: "QUÉ HACER AHORA". */
export function Kicker({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[12px] font-extrabold uppercase tracking-[0.8px] text-[#4A4541] ${className}`}
    >
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[#1B1B1A] text-white hover:bg-[#3A3836]",
  secondary: "bg-white text-[#1B1B1A] hover:bg-[#F6F2EF]",
};

/** Black-edged, uppercase. Primary is filled black. */
export function PanelButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border-2 border-[#1B1B1A] px-5 text-[13px] font-extrabold uppercase tracking-[0.6px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B1A] disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * A row of mutually exclusive options drawn as one bordered control. Buttons
 * with `aria-pressed` rather than radios: each is a view switch that acts at
 * once, which is what a toggle button announces.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex overflow-hidden rounded-[10px] border-2 border-[#1B1B1A]"
    >
      {options.map((option) => {
        const pressed = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.id)}
            className={`min-h-[40px] flex-1 whitespace-nowrap px-3.5 text-[13px] font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-current ${
              pressed ? "bg-[#1B1B1A] text-white" : "bg-white text-[#1B1B1A]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A coloured round marker that carries no meaning on its own. */
export function Dot({
  color,
  size = 10,
  border = INK,
}: {
  color: string;
  size?: number;
  border?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        border: `1px solid ${border}`,
      }}
    />
  );
}

/** An empty or unavailable state inside a card. */
export function PanelNotice({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] bg-[#F6F2EF] px-4 py-3">
      <p className="m-0 text-[14px] font-bold text-[#1B1B1A]">{title}</p>
      {body && <p className="m-0 text-[13px] text-[#3E3A36]">{body}</p>}
    </div>
  );
}
