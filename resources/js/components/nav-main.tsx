import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    // Load expanded state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('nav-expanded-items');
        if (saved) {
            try {
                setExpandedItems(new Set(JSON.parse(saved)));
            } catch (e) {
                console.error('Failed to parse expanded items:', e);
            }
        }
    }, []);

    const toggleExpanded = (itemTitle: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemTitle)) {
                next.delete(itemTitle);
            } else {
                next.add(itemTitle);
            }
            // Save to localStorage
            localStorage.setItem('nav-expanded-items', JSON.stringify(Array.from(next)));
            return next;
        });
    };

    return (
        <SidebarGroup className="px-2 py-0">
            {/* <SidebarGroupLabel>Platform</SidebarGroupLabel> */}
            <SidebarMenu>
                {items.map((item) => {
                    const childItems = item.children ?? [];
                    const hasActiveChild = childItems.some((child) =>
                        isCurrentUrl(child.href)
                    );
                    const isActive = isCurrentUrl(item.href) || hasActiveChild;
                    const isExpanded = expandedItems.has(item.title) || hasActiveChild;
                    const hasChildren = childItems.length > 0;

                    return (
                        <SidebarMenuItem key={item.title}>
                            {hasChildren ? (
                                <div className="relative">
                                    <SidebarMenuButton
                                        isActive={isActive}
                                        tooltip={{ children: item.title }}
                                        className="group"
                                    >
                                        <Link href={item.href} prefetch className="flex w-full items-center gap-2">
                                            {item.icon && <item.icon className="h-4 w-4" />}
                                            <span className="flex-1">{item.title}</span>
                                            {item.badgeCount && item.badgeCount > 0 && (
                                                <Badge className="h-5 min-w-5 rounded-full px-1 text-[10px] font-bold">
                                                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                                </Badge>
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                    <button
                                        onClick={(e) => toggleExpanded(item.title, e)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-sidebar-accent"
                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                        <ChevronDown
                                            className={`h-4 w-4 transition-transform duration-200 ${
                                                isExpanded ? 'rotate-0' : '-rotate-90'
                                            }`}
                                        />
                                    </button>
                                </div>
                            ) : (
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href} prefetch className="flex w-full items-center gap-2">
                                        {item.icon && <item.icon className="h-4 w-4" />}
                                        <span className="flex-1">{item.title}</span>
                                        {item.badgeCount && item.badgeCount > 0 && (
                                            <Badge className="h-5 min-w-5 rounded-full px-1 text-[10px] font-bold">
                                                {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                            </Badge>
                                        )}
                                    </Link>
                                </SidebarMenuButton>
                            )}
                            {childItems.length > 0 && isExpanded && (
                                <SidebarMenuSub>
                                    {childItems.map((child) => (
                                        <SidebarMenuSubItem key={child.title}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isCurrentUrl(
                                                    child.href
                                                )}
                                            >
                                                <Link href={child.href} className="flex w-full items-center gap-2">
                                                    <span className="flex-1">{child.title}</span>
                                                    {child.badgeCount && child.badgeCount > 0 && (
                                                        <Badge className="h-5 min-w-5 rounded-full px-1 text-[10px] font-bold">
                                                            {child.badgeCount > 99 ? '99+' : child.badgeCount}
                                                        </Badge>
                                                    )}
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
