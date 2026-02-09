import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="absolute right-4 flex items-center gap-6 justify-end">
                <div className="text-sm font-bold hidden sm:block">
                    {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                        })}
                </div>
                <div className="h-6 w-px bg-slate-300" />
                <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest">Register:</span>
                <span className='w-2 h-2 rounded-full bg-rose-500'></span>
                <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Closed</span>
            </div>
          </div>       
        </header>
    );
}
