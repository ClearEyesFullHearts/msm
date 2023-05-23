<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAuthStore } from '@/stores';

const schema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    secret: Yup.array().required('Your key is required')
});

async function loadTextFromFile(ev) {
    return new Promise((resolve) => {
        const file = ev[0]
        const reader = new FileReader()

        reader.onload = (e) => {
            resolve(e.target.result)
        }
        reader.readAsText(file)
    })
}

async function onSubmit(values) {
    const authStore = useAuthStore();
    const { username, secret } = values;
    const key = await loadTextFromFile(secret);
    await authStore.login(username, key);
}
</script>

<template>
    <div class="card m-3">
        <h4 class="card-header">Login</h4>
        <div class="card-body">
            <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
                <div class="form-group">
                    <label>@</label>
                    <Field name="username" type="text" class="form-control" :class="{ 'is-invalid': errors.username }" />
                    <div class="invalid-feedback">{{ errors.username }}</div>
                </div>
                <div class="form-group">
                    <label>Your secret key</label>
                    <Field name="secret" type="file" class="form-control" :class="{ 'is-invalid': errors.secret }" />
                    <div class="invalid-feedback">{{ errors.secret }}</div>
                </div>
                <div class="form-group">
                    <button class="btn btn-primary" :disabled="isSubmitting">
                        <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
                        Login
                    </button>
                    <router-link to="register" class="btn btn-link">Register</router-link>
                </div>
                
            </Form>
        </div>
    </div>
</template>
