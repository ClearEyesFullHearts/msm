import {
  Layout, Profile, Contacts, Vault,
} from '@/views/profile';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'profile', component: Profile },
    { path: 'contacts', component: Contacts },
    { path: 'vault', component: Vault },
  ],
};
