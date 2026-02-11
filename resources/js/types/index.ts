export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Auth } from './auth';

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    register?: {
        status: 'open' | 'closed';
    };
    [key: string]: unknown;
};
