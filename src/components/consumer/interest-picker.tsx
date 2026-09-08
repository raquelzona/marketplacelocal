import { INTEREST_CATEGORIES } from "@/lib/consumer/categories";

export function InterestPicker({selected,onChange}:{selected:string[];onChange?:(values:string[])=>void}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {INTEREST_CATEGORIES.map(category => { const checked=selected.includes(category); return <label key={category} className="cursor-pointer"><input className="peer sr-only" type="checkbox" name="interests" value={category} checked={onChange ? checked : undefined} defaultChecked={onChange ? undefined : checked} onChange={onChange ? ()=>onChange(checked ? selected.filter(item=>item!==category) : [...selected,category]) : undefined}/><span className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-800 peer-focus-visible:ring-4 peer-focus-visible:ring-teal-600/15">{category}</span></label> })}
  </div>;
}
