import { Link, usePage } from '@inertiajs/react';
import { ChartNoAxesCombinedIcon, HistoryIcon, LayoutGrid, PcCaseIcon, PiggyBankIcon, SettingsIcon, UsersIcon, UsersRoundIcon, WarehouseIcon } from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import pos from '@/routes/pos';
import type { NavItem, SharedData } from '@/types';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
        permission: 'access dashboard',
    },
    {
        title: 'POS',
        href: pos.index().url,
        icon: PcCaseIcon,
        permission: 'access pos',
    },
    {
        title: 'Cash Register',
        href: '/cash-register',
        icon: PiggyBankIcon,
        permission: 'access drawer',
    },
    {
        title: 'Inventory',
        href: '/inventory/items',
        icon: WarehouseIcon,
        permission: 'access inventory',
        children: [
            {
                title: 'Item List',
                href: '/inventory/items',
                permission: 'access inventory-items',
            },
            {
                title: 'Item Category',
                href: '/inventory/categories',
                permission: 'access inventory-categories',
            },
            {
                title: 'Purchase Orders',
                href: '/inventory/purchase-orders',
                permission: 'access inventory-purchase-orders',
            },
            {
                title: 'Stock Adjustment',
                href: '/inventory/stock-adjustments',
                permission: 'access inventory-stock-adjustments',
            },
            {
                title: 'Item Assembly',
                href: '/inventory/assembly',
                permission: 'access inventory-assembly',
            },
            {
                title: 'Supplier',
                href: '/inventory/suppliers',
                permission: 'access inventory-suppliers',
            },
            {
                title: 'Item Log',
                href: '/inventory/logs',
                permission: 'access inventory-log',
            },
        ],
    },
    {
        title: 'Sales History',
        href: dashboard(),
        icon: HistoryIcon,
        permission: 'access sales-history',
    },
    {
        title: 'Customers',
        href: '/customers',
        icon: UsersIcon,
        permission: 'access customers',
    },
    {
        title: 'Users',
        href: '/users',
        icon: UsersRoundIcon,
        permission: 'access users',
    },
    {
        title: 'Reports',
        href: dashboard(),
        icon: ChartNoAxesCombinedIcon,
        permission: 'access reports',
    },
    {
        title: 'Settings',
        href: dashboard(),
        icon: SettingsIcon,
        permission: 'access settings',
    },
];

const footerNavItems: NavItem[] = [
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const permissionSet = new Set(auth?.permissions ?? []);
    const filterItems = (items: NavItem[]): NavItem[] =>
        items
            .map((item) => {
                const visibleChildren = item.children
                    ? filterItems(item.children)
                    : undefined;
                const hasPermission =
                    !item.permission || permissionSet.has(item.permission);
                const hasChildren =
                    visibleChildren && visibleChildren.length > 0;

                if (!hasPermission && !hasChildren) {
                    return null;
                }

                const safeHref =
                    !hasPermission && hasChildren
                        ? visibleChildren[0].href
                        : item.href;

                return {
                    ...item,
                    href: safeHref,
                    children: hasChildren ? visibleChildren : undefined,
                };
            })
            .filter((item): item is NavItem => item !== null);

    const visibleMainNavItems = filterItems(mainNavItems);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleMainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
