<template>
	<div>
		<div v-for="(attr, idx) in selectedValues" :key="idx">
			<input type="checkbox" v-model="attr.isChecked" @change="change" />
			<span>{{ attr.attribute }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const emit = defineEmits(['update_filters'])
const props = defineProps<{
	values: any[]
	attribute_name: string
	attribute_id: string
}>()

const selectedValues = ref<{ attribute?: any; isChecked?: boolean }[]>([])

onMounted(() => {
	if (props.values?.length > 0) {
		selectedValues.value = props.values.map(value => {
			return { attribute: value, isChecked: false }
		})
	}
})

const change = () => {
	emit('update_filters', {
		attribute_name: props.attribute_name,
		attribute_id: props.attribute_id,
		values: selectedValues.value.map(r => (r.isChecked ? r.attribute : null)).filter(r => r !== null),
	})
}
</script>
