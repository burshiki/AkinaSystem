import { Link } from '@inertiajs/react';
import { BadgeDollarSignIcon, BookOpen, ChartNoAxesCombinedIcon, Folder, HistoryIcon, LayoutGrid, PcCaseIcon, PiggyBankIcon, SettingsIcon, UsersIcon, UsersRoundIcon, WarehouseIcon } from 'lucide-react';
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
import type { NavItem } from '@/types';
import AppLogo from './app-logo';
import { report } from 'process';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'POS',
        href: dashboard(),
        icon: PcCaseIcon,
    },
    {
        title: 'Drawer',
        href: dashboard(),
        icon: PiggyBankIcon,
    },
    {
        title: 'Inventory',
        href: dashboard(),
        icon: WarehouseIcon,
    },
    {
        title: 'Sales History',
        href: dashboard(),
        icon: HistoryIcon,
    },
    {
        title: 'Customers',
        href: dashboard(),
        icon: UsersIcon,
    },
    {
        title: 'Users',
        href: dashboard(),
        icon: UsersRoundIcon,
    },
    {
        title: 'Reports',
        href: dashboard(),
        icon: ChartNoAxesCombinedIcon,
    },
    {
        title: 'Settings',
        href: dashboard(),
        icon: SettingsIcon,
    },
];

const footerNavItems: NavItem[] = [
];

export function AppSidebar() {
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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
