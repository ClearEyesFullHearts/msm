<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { useMessagesStore, useAlertStore, useUsersStore } from '@/stores';
const router = useRouter();

const messageStore = useMessagesStore();
const alertStore = useAlertStore();
const userStore = useUsersStore();

let title = 'Write a Message';
const { targets, contentLength } = storeToRefs(messageStore);
messageStore.contentLength = 0;


const schema = Yup.object().shape({
    at: Yup.string()
        .required('Target @ is required'),
    title: Yup.string()
        .required('Title is required')
        .max(125, 'Title size is limited to 125 characters'),
    content: Yup.string()
        .required('Message text is required')
        .max(470, 'Message size is limited to 446 basic characters')
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
        const [{ at: targetAt, key: targetPem }] = userStore.users;

        const success = await messageStore.write(targetAt, targetPem, title, content, false);
        
        if(success) {
            await router.push('/messages');
            alertStore.success('Your message has been sent');
        }
    } catch (error) {
        alertStore.error(error);
    }
}
function onInputText(str) {
    messageStore.contentLength = (new TextEncoder().encode(str)).length;
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
                    <Field @input="event => onInputText(event.target.value)" name="content" as="textarea" cols="30" rows="10" class="form-control" :class="{ 'is-invalid': errors.content }" />
                    <span class="limiter">{{ contentLength }} / 446</span>
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
