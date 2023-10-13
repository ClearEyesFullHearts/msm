import { Layout, NewGroup, GroupDetail } from '@/views/groups';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'groups', component: NewGroup },
    { path: '/group/:id', component: GroupDetail, props: true },
  ],
};
