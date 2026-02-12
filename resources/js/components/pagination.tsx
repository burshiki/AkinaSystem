import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationData<T = any> {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: PaginationLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

interface PaginationProps {
    data: PaginationData;
}

export default function Pagination({ data }: PaginationProps) {
    // Always show pagination section for consistency, but only show nav buttons if multiple pages
    const hasMultiplePages = data.last_page > 1;

    return (
        <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
                Showing {data.from} to {data.to} of {data.total} results
            </div>
            {hasMultiplePages && (
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.prev_page_url}
                        asChild={!!data.prev_page_url}
                    >
                        {data.prev_page_url ? (
                            <Link href={data.prev_page_url} preserveState preserveScroll>
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Previous
                            </Link>
                        ) : (
                            <>
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Previous
                            </>
                        )}
                    </Button>

                    <div className="flex gap-1">
                        {data.links.slice(1, -1).map((link, index) => {
                            const pageNumber = link.label.replace(/&laquo;|&raquo;/g, '').trim();
                            
                            if (link.label === '...') {
                                return (
                                    <span key={index} className="px-2 py-1 text-sm text-muted-foreground">
                                        ...
                                    </span>
                                );
                            }

                            return (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    asChild={!!link.url}
                                    disabled={!link.url}
                                    className="min-w-[2.5rem]"
                                >
                                    {link.url ? (
                                        <Link href={link.url} preserveState preserveScroll>
                                            {pageNumber}
                                        </Link>
                                    ) : (
                                        <span>{pageNumber}</span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.next_page_url}
                        asChild={!!data.next_page_url}
                    >
                        {data.next_page_url ? (
                            <Link href={data.next_page_url} preserveState preserveScroll>
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Link>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
