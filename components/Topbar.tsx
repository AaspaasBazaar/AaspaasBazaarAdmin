import { SearchPalette } from "@/components/SearchPalette";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center px-8 py-4 border-b border-sage-200 bg-sage-50">
      <div className="flex-1">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-sub mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <SearchPalette />

        <span className="inline-flex h-[38px] items-center rounded-[11px] bg-leaf-50 px-3 text-[12px] font-semibold text-leaf-700">
          Geofence · 3km
        </span>

        <button className="relative h-10 w-10 rounded-[11px] border border-sage-200 bg-white grid place-items-center">
          <svg className="h-4 w-4 text-sage-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-600" />
        </button>
      </div>
    </header>
  );
}
