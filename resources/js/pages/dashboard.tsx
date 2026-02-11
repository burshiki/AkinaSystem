import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

type ChartPoint = {
    date: string;
    revenue: number;
};

type DashboardProps = {
    metrics: {
        revenueToday: number;
        profitToday: number;
        ordersToday: number;
    };
    chart: {
        range: string;
        from: string;
        to: string;
        points: ChartPoint[];
    };
    lowStockItems: Array<{ id: number; name: string; stock: number }>;
    recentSales: Array<{
        id: number;
        total: number;
        customer: string;
        created_at: string;
    }>;
};

const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
});

export default function Dashboard() {
    const { metrics, chart, lowStockItems, recentSales } =
        usePage<DashboardProps>().props;
    const [range, setRange] = useState(chart.range);
    const [from, setFrom] = useState(chart.from);
    const [to, setTo] = useState(chart.to);

    const chartPath = useMemo(() => {
        if (!chart.points.length) return '';

        const width = 600;
        const height = 180;
        const padding = 24;
        const maxRevenue = Math.max(
            ...chart.points.map((point) => point.revenue),
            1
        );

        const xStep =
            chart.points.length > 1
                ? (width - padding * 2) / (chart.points.length - 1)
                : 0;

        return chart.points
            .map((point, index) => {
                const x = padding + index * xStep;
                const y =
                    height -
                    padding -
                    (point.revenue / maxRevenue) * (height - padding * 2);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
    }, [chart.points]);

    const applyRange = (nextRange: string) => {
        setRange(nextRange);
        if (nextRange !== 'custom') {
            router.get(
                '/dashboard',
                { range: nextRange },
                { preserveScroll: true, preserveState: true, replace: true }
            );
        }
    };

    const applyCustomRange = () => {
        router.get(
            '/dashboard',
            { range: 'custom', from, to },
            { preserveScroll: true, preserveState: true, replace: true }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground">Today's Revenue</p>
                        <p className="text-2xl font-semibold text-foreground">
                            {currency.format(metrics.revenueToday)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground">Today's Profit</p>
                        <p className="text-2xl font-semibold text-foreground">
                            {currency.format(metrics.profitToday)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground">Today's Orders</p>
                        <p className="text-2xl font-semibold text-foreground">
                            {metrics.ordersToday}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold">Revenue</h2>
                            <p className="text-sm text-muted-foreground">
                                {chart.from} to {chart.to}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={range} onValueChange={applyRange}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="7d">Last 7 days</SelectItem>
                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                            {range === 'custom' && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        type="date"
                                        value={from}
                                        onChange={(event) =>
                                            setFrom(event.target.value)
                                        }
                                        className="w-36"
                                    />
                                    <Input
                                        type="date"
                                        value={to}
                                        onChange={(event) =>
                                            setTo(event.target.value)
                                        }
                                        className="w-36"
                                    />
                                    <Button onClick={applyCustomRange}>
                                        Apply
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <svg
                            width="100%"
                            height="200"
                            viewBox="0 0 600 200"
                            className="text-slate-200"
                        >
                            <path
                                d={chartPath}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 shadow-sm">
                        <h3 className="text-lg font-semibold">Low Stock Items</h3>
                        <div className="mt-4 space-y-3">
                            {lowStockItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No low stock items.
                                </p>
                            ) : (
                                lowStockItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-sm text-foreground">
                                            {item.name}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {item.stock} left
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 shadow-sm">
                        <h3 className="text-lg font-semibold">Recent Activity</h3>
                        <div className="mt-4 space-y-3">
                            {recentSales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No recent sales.
                                </p>
                            ) : (
                                recentSales.map((sale) => (
                                    <div key={sale.id} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-foreground">
                                                {sale.customer}
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {currency.format(sale.total)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {sale.created_at}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
