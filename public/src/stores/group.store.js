/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';

export const useGroupStore = defineStore({
  id: 'group',
  state: () => ({
    alert: null,
  }),
  actions: {
    create({ groupName }) {
      
    },
  },
});
