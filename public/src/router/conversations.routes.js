import {
  Layout, Inbox, ShowConvo,
} from '@/views/conversations';

export default {
  path: '/conversations',
  component: Layout,
  children: [
    { path: '', component: Inbox },
    { path: '/conversations/:at', component: ShowConvo, props: true },
  ],
};
