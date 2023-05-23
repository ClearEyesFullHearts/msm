<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { storeToRefs } from 'pinia';

import { useMessagesStore, useAlertStore, useUsersStore } from '@/stores';
import { router } from '@/router';

const messageStore = useMessagesStore();
const alertStore = useAlertStore();
const userStore = useUsersStore();

let title = 'Write a Message';
const { targets } = storeToRefs(messageStore);


const schema = Yup.object().shape({
    at: Yup.string()
        .required('Target @ is required'),
    title: Yup.string()
        .required('Title is required')
        .max(125, 'Title size is limited to 125 characters'),
    content: Yup.string()
        .required('Message text is required')
        .max(470, 'Message size is limited to 470 basic characters')
});

async function onSubmit(values) {
    try {
        let message;

        const {
            at,
            title,
            content,
        } = values;
        await userStore.getAll(at);
        console.log(userStore.users);
        const [{ at: targetAt, key: targetPem }] = userStore.users;
        await messageStore.write(targetAt, targetPem, title, content, false);
        await router.push('/messages');
        alertStore.success('Your message has been sent');
    } catch (error) {
        alertStore.error(error);
    }
}
</script>

<template>
    <h1>{{title}}</h1>
    <template v-if="true">
        <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
            <div class="form-row">
                <div class="form-group col">
                    <label>@</label>
                    <Field name="at" type="text" class="form-control" :class="{ 'is-invalid': errors.at }" />
                    <div class="invalid-feedback">{{ errors.at }}</div>
                </div>
                <div class="form-group col">
                    <label>Message Title</label>
                    <Field name="title" type="text" class="form-control" :class="{ 'is-invalid': errors.title }" />
                    <div class="invalid-feedback">{{ errors.title }}</div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group col">
                    <label>Message text</label>
                    <Field name="content" as="textarea" cols="30" rows="10" class="form-control" :class="{ 'is-invalid': errors.content }" />
                    <div class="invalid-feedback">{{ errors.content }}</div>
                </div>
                
            </div>
            <div class="form-group">
                <button class="btn btn-primary" :disabled="isSubmitting">
                    <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
                    Save
                </button>
                <router-link to="/messages" class="btn btn-link">Cancel</router-link>
            </div>
        </Form>
    </template>
</template>
