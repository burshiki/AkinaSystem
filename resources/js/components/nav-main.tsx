import { Link } from '@inertiajs/react';
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
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

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

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch className="flex w-full items-center gap-2">
                                    {item.icon && <item.icon />}
                                    <span className="flex-1">{item.title}</span>
                                    {item.badgeCount && item.badgeCount > 0 && (
                                        <Badge className="h-5 min-w-5 rounded-full px-1 text-[10px] font-bold">
                                            {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                        </Badge>
                                    )}
                                </Link>
                            </SidebarMenuButton>
                            {childItems.length > 0 && (
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
