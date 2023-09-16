import {
  Layout, Profile, Vault,
} from '@/views/profile';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'profile', component: Profile },
    { path: 'vault', component: Vault },
  ],
};
