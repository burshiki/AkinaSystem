import { Link, usePage } from '@inertiajs/react';
import { ChartNoAxesCombinedIcon, DollarSignIcon, HistoryIcon, LayoutGrid, PcCaseIcon, PiggyBankIcon, SettingsIcon, ShieldCheckIcon, UsersIcon, UsersRoundIcon, WarehouseIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
        title: 'Warranty',
        href: '/warranty',
        icon: ShieldCheckIcon,
        permission: 'access warranty',
    },
    {
        title: 'Register History',
        href: '/register-history',
        icon: HistoryIcon,
        permission: 'access register-history',
    },
    {
        title: 'Income/Expense',
        href: '/income-expense',
        icon: DollarSignIcon,
        permission: 'access income-expense',
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
        href: '/reports/sales-summary',
        icon: ChartNoAxesCombinedIcon,
        permission: 'access reports',
        children: [
            {
                title: 'Sales Summary',
                href: '/reports/sales-summary',
            },
            {
                title: 'Sales by Item',
                href: '/reports/sales-by-item',
            },
            {
                title: 'Sales by Employee',
                href: '/reports/sales-by-employee',
            },
            {
                title: 'Sales by Payment Type',
                href: '/reports/sales-by-payment-type',
            },
            {
                title: 'Receipts',
                href: '/reports/receipts',
            },
            {
                title: 'Inventory Valuation',
                href: '/reports/inventory-valuation',
            },
            {
                title: 'Inventory Count',
                href: '/reports/inventory-count',
            },
        ],
    },
    {
        title: 'Options',
        href: '/settings/bank-accounts',
        icon: SettingsIcon,
        permission: 'access settings',
        children: [
            {
                title: 'Manage Bank Accounts',
                href: '/settings/bank-accounts',
            },
        ],
    },
];

const footerNavItems: NavItem[] = [
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const permissionSet = useMemo(
        () => new Set(auth?.permissions ?? []),
        [auth?.permissions]
    );
    const [purchaseOrderBadgeCount, setPurchaseOrderBadgeCount] = useState(0);

    const canSeePurchaseOrders = permissionSet.has(
        'access inventory-purchase-orders'
    );

    const fetchPurchaseOrderBadgeCount = useCallback(async () => {
        if (!canSeePurchaseOrders) return;

        try {
            const response = await fetch('/inventory/purchase-orders/badge-count');
            if (!response.ok) return;
            const data = await response.json();
            setPurchaseOrderBadgeCount(
                typeof data.count === 'number' ? data.count : 0
            );
        } catch (error) {
            console.error('Error fetching purchase order badge count:', error);
        }
    }, [canSeePurchaseOrders]);

    useEffect(() => {
        if (!canSeePurchaseOrders) return;

        const initialFetchTimer = setTimeout(() => {
            fetchPurchaseOrderBadgeCount();
        }, 0);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchPurchaseOrderBadgeCount();
            }
        }, 5000);

        return () => {
            clearTimeout(initialFetchTimer);
            clearInterval(interval);
        };
    }, [canSeePurchaseOrders, fetchPurchaseOrderBadgeCount]);

    useEffect(() => {
        if (!canSeePurchaseOrders) return;

        const handleBadgeUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ count: number }>;
            const nextCount = customEvent.detail?.count;
            if (typeof nextCount === 'number') {
                setPurchaseOrderBadgeCount(nextCount);
            }
        };

        window.addEventListener('purchase-orders-badge', handleBadgeUpdate);
        return () =>
            window.removeEventListener(
                'purchase-orders-badge',
                handleBadgeUpdate
            );
    }, [canSeePurchaseOrders]);
    function filterItems(items: NavItem[]): NavItem[] {
        const mappedItems: Array<NavItem | null> = items.map((item) => {
            const visibleChildren = item.children
                ? filterItems(item.children)
                : undefined;
            const hasPermission =
                !item.permission || permissionSet.has(item.permission);
            const hasChildren =
                (visibleChildren?.length ?? 0) > 0;

            if (!hasPermission && !hasChildren) {
                return null;
            }

            const safeHref =
                !hasPermission && hasChildren
                    ? visibleChildren?.[0]?.href ?? item.href
                    : item.href;

            return {
                ...item,
                href: safeHref,
                ...(hasChildren ? { children: visibleChildren } : {}),
            };
        });

        return mappedItems.filter((item): item is NavItem => item !== null);
    }

    const visibleMainNavItems = (() => {
        const filteredItems = filterItems(mainNavItems);
        if (!purchaseOrderBadgeCount) return filteredItems;

        return filteredItems.map((item) => {
            if (!item.children) return item;

            const updatedChildren = item.children.map((child) => {
                if (child.href === '/inventory/purchase-orders') {
                    return {
                        ...child,
                        badgeCount: purchaseOrderBadgeCount,
                    };
                }
                return child;
            });

            return {
                ...item,
                children: updatedChildren,
            };
        });
    })();

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
