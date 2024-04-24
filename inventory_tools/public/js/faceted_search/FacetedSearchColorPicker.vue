<template>
	<div>
		<div class="colorpicker">
			<div v-for="(attr, idx) in selectedValues" :key="idx" class="color-card" @click="selectColor(attr, idx)">
				<div class="color-display" :style="getBackground(attr)">
					<p :style="{ 'color': attr.isChecked ? contrast(attr.attribute[1]) : 'transparent' }">✓</p>
				</div>
				<span> {{ attr.attribute[0] }} </span>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'FacetedSearchColorPicker',
	props: ['values', 'attribute_name', 'attribute_id'],
	data() {
		return { selectedValues: [] }
	},
	methods: {
		change() {
			this.$emit('update_filters', {
				attribute_name: this.attribute_name,
				attribute_id: this.attribute_id,
				values: this.selectedValues
					.map(r => {
						return r.isChecked ? r.attribute[0] : null
					})
					.filter(r => {
						return r != null
					}),
			})
		},
		selectColor(attr, idx) {
			attr.isChecked = !attr.isChecked
			this.change()
		},
		getBackground(attr) {
			if (attr.attribute[2] != undefined) {
				return { 'background-image': `url("${attr.attribute[2]}")` }
			} else {
				return { 'background-color': attr.attribute[1] }
			}
		},
		contrast(color) {
			if (
				(['E', 'F'].includes(color.substring(1, 2).toUpperCase()) && ['E', 'F'].includes(color.substring(3, 4).toUpperCase())) ||
				(['E', 'F'].includes(color.substring(3, 4).toUpperCase()) && ['E', 'F'].includes(color.substring(5, 6).toUpperCase())) ||
				(['E', 'F'].includes(color.substring(1, 2).toUpperCase()) && ['E', 'F'].includes(color.substring(5, 6).toUpperCase()))
			) {
				return '	#192734'
			}
			return 'white'
		}
	},
	mounted() {
		if (this.values) {
			this.selectedValues = this.values.map(v => {
				return { attribute: v, isChecked: false }
			})
		}
	},
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

.color-display {
	display: flex;
	min-height: .75rem;
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