import { Layout, Create, Connect } from '@/views/account';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'login', component: Connect },
    { path: 'register', component: Create },
  ],
};
