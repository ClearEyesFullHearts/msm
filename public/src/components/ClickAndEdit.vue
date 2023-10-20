<script setup>
import {
  ref, onMounted,
} from 'vue';

const props = defineProps(['textValue', 'editable']);

const emit = defineEmits(['saveEdit', 'isEditing']);

const edit = ref(false);
const localName = ref('');

onMounted(() => {
  localName.value = props.textValue;
});

function cancelEditing() {
  edit.value = false;
}
function startEditing() {
  if (props.editable) {
    edit.value = true;
    localName.value = props.textValue;
    emit('isEditing');
  }
}

function save() {
  emit('saveEdit', localName.value);
  edit.value = false;
}

defineExpose({
  cancelEditing,
});

</script>
<template>
  <div
    v-if="edit"
    class="input-group"
  >
    <input
      id="editableTextInput"
      v-model="localName"
      type="text"
      class="form-control"
    >
    <button
      id="button-addon2"
      class="btn btn-outline-secondary"
      type="button"
      @click.stop="save()"
    >
      Save
    </button>
  </div>
  <span
    v-if="!edit"
    translate="no"
    @click.stop="startEditing()"
  >{{ textValue }}</span>
</template>
