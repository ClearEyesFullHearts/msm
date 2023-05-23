import { Layout, WriteMessage, List } from '@/views/messages';

export default {
    path: '/messages',
    component: Layout,
    children: [
        { path: '', component: List },
        { path: 'write', component: WriteMessage },
        // { path: 'show/:id', component: AddEdit }
    ]
};
