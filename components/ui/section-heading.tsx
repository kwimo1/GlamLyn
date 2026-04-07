import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "text-center" : "")}>
      <p className="text-xs uppercase tracking-[0.38em] text-[var(--gold-deep)]">
        {eyebrow}
      </p>
      <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-none text-[var(--ink)] sm:text-5xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-7 text-[var(--muted-ink)] sm:text-base">
        {description}
      </p>
    </div>
  );
}
