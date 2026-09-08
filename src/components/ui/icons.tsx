import type { SVGProps } from "react";
type IconProps = SVGProps<SVGSVGElement>;
const base = { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.8 };
export function ArrowRightIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" /></svg>}
export function ChartIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>}
export function MapPinIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>}
export function StoreIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 10v10h16V10M3 4h18l-2 6H5L3 4Zm6 16v-6h6v6"/></svg>}
export function UserIcon(props:IconProps){return <svg {...base} {...props}><circle cx="12" cy="8" r="4"/><path strokeLinecap="round" d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>}
export function ShieldIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v5.5c0 4.6 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.9 7.5-9.5V6L12 3Z"/><path strokeLinecap="round" d="m9 12 2 2 4-4"/></svg>}
export function HomeIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8v9H3v-9Z"/><path d="M9 20v-6h6v6"/></svg>}
export function SearchIcon(props:IconProps){return <svg {...base} {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path strokeLinecap="round" d="m16 16 5 5"/></svg>}
export function ClipboardIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H5v16h14V5h-4M9 3h6v4H9V3Z"/><path strokeLinecap="round" d="M8 12h8M8 16h5"/></svg>}
export function HeartIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20.8 5.7c-2.1-2.3-5.4-1.8-7.1.5L12 8.4l-1.7-2.2C8.6 3.9 5.3 3.4 3.2 5.7.9 8.2 1.4 12.2 4 14.6L12 22l8-7.4c2.6-2.4 3.1-6.4.8-8.9Z"/></svg>}
export function ClockIcon(props:IconProps){return <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 7v5l3 2"/></svg>}
export function PhoneIcon(props:IconProps){return <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-5-1-1.2 3a16.2 16.2 0 0 1-9.8-9.8L8 8 7 3Z"/></svg>}
