"use client";

import {
  AlertTriangle,
  Bot,
  Building,
  Hexagon,
  LucideIcon,
  ScanHeart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};
const menuItems: MenuItem[] = [
  { name: "Graph", href: "/", icon: Hexagon },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Enterprises", href: "/enterprises", icon: Building },
  { name: "Agent", href: "/agent", icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full rounded-r-xl w-56 flex-col border-r border-border bg-surface">
      <ul className="flex flex-col gap-3 p-2">
        <li className="flex items-center gap-2 px-3 py-2 text-2xl font-display">
          <ScanHeart />
          DMSPN
        </li>
        <hr className="text-border-subtle" />
        {menuItems.map((i) => {
          const isActive = pathname === i.href;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-subtle text-brand"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                }`}
              >
                <i.icon size={18} />
                {i.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
