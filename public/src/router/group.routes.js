import { Layout, NewGroup } from '@/views/groups';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'groups', component: NewGroup },
  ],
};
