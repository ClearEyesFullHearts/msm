import {
  Layout, List,
} from '@/views/memory';

export default {
  path: '/memory',
  component: Layout,
  children: [
    { path: '', component: List },
  ],
};
