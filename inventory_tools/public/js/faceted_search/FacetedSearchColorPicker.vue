<template>
	<div>
		<div class="colorpicker">
			<div v-for="(attr, idx) in selectedValues" :key="idx" class="color-card" @click="selectColor(attr)">
				<div class="color-display" :style="getBackground(attr)">
					<p :style="{ color: attr.isChecked ? contrast(attr.attribute[1]) : 'transparent' }">✓</p>
				</div>
				<span> {{ attr.attribute[0] }} </span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

export type Value = {
	attribute: string[]
	isChecked: boolean
}

const emit = defineEmits(['update_filters'])
const props = defineProps<{
	values: any[]
	attribute_name: string
	attribute_id: string
}>()

const selectedValues = ref<Value[]>([])

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
		values: selectedValues.value
			.map(r => {
				return r.isChecked ? r.attribute[0] : null
			})
			.filter(r => {
				return r != null
			}),
	})
}

const selectColor = (attr: Value) => {
	attr.isChecked = !attr.isChecked
	change()
}

const getBackground = (attr: Value) => {
	if (attr.attribute[2] != undefined) {
		return { 'background-image': `url("${attr.attribute[2]}")` }
	} else {
		return { 'background-color': attr.attribute[1] }
	}
}

const contrast = (color: string) => {
	if (
		(['E', 'F'].includes(color.substring(1, 2).toUpperCase()) &&
			['E', 'F'].includes(color.substring(3, 4).toUpperCase())) ||
		(['E', 'F'].includes(color.substring(3, 4).toUpperCase()) &&
			['E', 'F'].includes(color.substring(5, 6).toUpperCase())) ||
		(['E', 'F'].includes(color.substring(1, 2).toUpperCase()) &&
			['E', 'F'].includes(color.substring(5, 6).toUpperCase()))
	) {
		return '#192734'
	} else {
		return 'white'
	}
}
</script>

<style scoped>
.colorpicker {
	display: flex;
	flex-wrap: wrap;
}

.color-card {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 4rem;
	max-width: 4rem;
}

input {
	display: none;
}

.scrollable-filter {
	min-height: 12.5rem;
}

.color-display {
	display: flex;
	min-height: 0.75rem;
	clip-path: circle(40%);
	flex-direction: column;
	justify-content: center;
	text-align: center;
	background-size: contain;
}

.colorpicker span {
	font-size: 90%;
	user-select: none;
	overflow: hidden;
	text-overflow: clip;
	text-align: center;
	align-self: center;
}

.color-display p {
	user-select: none;
	display: relative;
	font-size: 200%;
	margin-bottom: 0.5rem;
	padding-top: 0.125rem;
}
</style>
