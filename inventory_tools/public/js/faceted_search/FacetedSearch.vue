<template>
	<ul class="list-unstyled sidebar-menu faceted-search-box">
		<li v-for="(comp, idx) in searchComponents" :key="idx">
			<div class="faceted-search-attribute" @click="toggleFilters(idx)">
				<B> {{ comp.attribute_name }} </B>
				<svg class="icon icon-sm float-right">
					<use href="#icon-small-down" v-show="!comp.visible"></use>
					<use href="#icon-small-up" v-show="comp.visible"></use>
				</svg>
			</div>
			<component
				v-show="comp.visible"
				class="scrollable-filter"
				:is="comp.component"
				:values="comp.values"
				:attribute_name="comp.attribute_name"
				:attribute_id="comp.attribute_id"
				@update_filters="updateFilters"></component>
			<hr />
		</li>
	</ul>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { onMounted, ref } from 'vue'

export type ListviewFilter = [string, string, string, any] | [string, string, string, any, boolean] | any[]
export type SearchComponent = FilterValue | { [key: string]: FilterValue }
export type FilterValue = {
	attribute_id: string
	attribute_name: string
	component?: string
	date_values?: boolean
	field?: string
	numeric_values?: boolean
	sort_order?: string
	values?: any[]
	visible?: boolean
}

frappe.provide('webshop')

const props = withDefaults(
	defineProps<{
		doctype: string
	}>(),
	{
		doctype: 'Item',
	}
)

const searchComponents = ref<SearchComponent[]>([])
const filterValues = ref<{
	[key: string]: Partial<FilterValue>
}>({})
const sortOrder = ref('')

onMounted(async () => {
	await loadFacets()
})

const toggleFilters = (idx: number) => {
	searchComponents.value[idx].visible = !searchComponents.value[idx].visible
}

const updateFilters = (values: FilterValue) => {
	if (values.sort_order) {
		sortOrder.value = values.sort_order
	} else {
		filterValues.value[values.attribute_name] = {
			attribute_id: values.attribute_id,
			values: values.values,
		}
	}

	watchDebounced(
		filterValues.value,
		async (value, oldValue) => {
			await setFilterValues()
		},
		{ debounce: 500, maxWait: 1000 }
	)
}

const loadFacets = async () => {
	const { message }: { message: SearchComponent[] } = await frappe.call({
		method: 'inventory_tools.inventory_tools.faceted_search.show_faceted_search_components',
		args: { doctype: props.doctype, filters: filterValues.value },
		headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token },
	})

	searchComponents.value = message
	for (const value of Object.values(message)) {
		updateFilters(value)
	}
}

const setFilterValues = async () => {
	if (webshop && window.cur_list === undefined) {
		const response = await frappe.xcall('webshop.webshop.api.get_product_filter_data', {
			query_args: {
				attributes: filterValues.value,
				sort_order: sortOrder.value,
			},
		})

		if (!response.items) return

		let view_type = localStorage.getItem('product_view') || 'List View'
		if (view_type == 'List View') {
			new webshop.ProductList({
				items: response.items,
				products_section: $('#products-list-area'),
				settings: response.settings,
				preference: view_type,
			})
		} else {
			new webshop.ProductGrid({
				items: response.items,
				products_section: $('#products-grid-area'),
				settings: response.settings,
				preference: view_type,
			})
		}
	} else if (window.cur_list !== undefined) {
		const items = await frappe.xcall('inventory_tools.inventory_tools.faceted_search.get_specification_items', {
			attributes: filterValues.value,
		})
		const listview = frappe.get_list_view(props.doctype) || 'Item'
		let filters: ListviewFilter = listview.filter_area.get()

		for (const [key, value] of Object.entries(filterValues.value)) {
			const values = value.values
			const attribute = Object.values(searchComponents.value).find(comp => comp.attribute_name === key)

			if (attribute?.field) {
				if (Array.isArray(values)) {
					if (values.length > 0) {
						if (!values[0] && !values[1]) {
							// TODO: handle case where numeric range is unset
						} else {
							filters.push([props.doctype, attribute.field, 'in', values])
						}
					} else {
						filters = filters.filter(filter => filter[1] !== attribute.field)
					}

					refreshFilters(filters)
				} else {
					// TODO: handle edge-case?
				}
			} else {
				if (Array.isArray(values)) {
					if (!values[0] && !values[1]) {
						// TODO: handle case where numeric range is unset
					} else {
						const existing_name_filter = filters.filter(filter => filter[1] === 'name')
						if (existing_name_filter.length > 0) {
							const existing_name_filter_value = existing_name_filter[3]
							filters = filters.filter(filter => filter[1] !== 'name')
							if (Array.isArray(existing_name_filter_value)) {
								filters.push([props.doctype, 'name', 'in', [...existing_name_filter_value, ...items]])
							} else {
								filters.push([props.doctype, 'name', 'in', [existing_name_filter_value, ...items]])
							}
						} else {
							filters.push([props.doctype, 'name', 'in', items])
						}

						refreshFilters(filters)
					}
				} else {
					// TODO: handle edge-case?
				}
			}
		}
	}
}

const refreshFilters = (filters: ListviewFilter) => {
	const listview = frappe.get_list_view(props.doctype)
	listview.filter_area.clear(false)
	listview.filter_area.set(filters)
	listview.refresh()
}

defineExpose({ updateFilters })
</script>

<style scoped>
.faceted-search-box {
	min-height: 25rem;
	flex-direction: column;
	flex-basis: 100%;
	flex: 1;
}

.scrollable-filter {
	max-height: 7rem;
	overflow-y: auto;
	margin-bottom: 1rem;
	flex-direction: column;
	flex-wrap: wrap;
	width: 100%;
}

.faceted-search-attribute {
	flex-flow: row;
	cursor: pointer;
}

/* width */
::-webkit-scrollbar {
	width: 11px;
}

/* Track */
::-webkit-scrollbar-track {
	box-shadow: inset 0 0 5px grey;
	border-radius: 7px;
}

/* Handle */
::-webkit-scrollbar-thumb {
	background: var(--gray-700);
	border-radius: 7px;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
	background: var(--primary);
}

@-moz-document url-prefix() {
	.scrollable-filter {
		scrollbar-width: thin; /* Set the width of the scrollbar */
		scrollbar-color: var(--gray-700) #eee; /* Set the color of the scrollbar thumb and track */
	}
	.scrollable-filter:hover {
		scrollbar-color: var(--primary) #eee;
	}
}
</style>
