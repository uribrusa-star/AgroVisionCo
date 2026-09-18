'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, getDefaultBottomNavItems } from '@/lib/navigation-config';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';

export function MobileBottomNav({ user }: { user: User }) {
  const pathname = usePathname();

  // If user disabled bottom nav explicitly, return null
  if (user.bottomNavEnabled === false) {
    return null;
  }

  // Get selected routes or defaults for user role
  const enabledRoutes = user.bottomNavItems && user.bottomNavItems.length > 0
    ? user.bottomNavItems
    : getDefaultBottomNavItems(user.role);

  // Filter valid NAV_ITEMS allowed for the user role and included in user preferences
  const itemsToRender = NAV_ITEMS.filter(item => 
    item.roles.includes(user.role) && enabledRoutes.includes(item.href)
  ).slice(0, 5); // Ensure maximum 5 items

  if (itemsToRender.length === 0) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
      <nav className="flex items-center justify-around h-16 px-1">
        {itemsToRender.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const label = item.shortLabel || item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-1 py-1 transition-colors rounded-lg",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div className={cn(
                "p-1 rounded-full transition-transform",
                isActive ? "bg-primary/10 scale-110" : ""
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] leading-tight truncate mt-0.5 max-w-[64px] text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
