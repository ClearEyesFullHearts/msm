import { Layout, Login, Register } from '@/views/account';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'login', component: Login },
    { path: 'register', component: Register },
  ],
};
