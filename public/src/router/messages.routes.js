import {
  Layout, WriteMessage, Inbox, ShowMessage,
} from '@/views/messages';

export default {
  path: '/messages',
  component: Layout,
  children: [
    { path: '', component: Inbox },
    { path: 'write', component: WriteMessage },
    { path: 'show/:id', component: ShowMessage },
  ],
};
