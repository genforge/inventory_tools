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
				class="scrollable-filter"
				:is="comp.component"
				:values="comp.values"
				:attribute_name="comp.attribute_name"
				:attribute_id="comp.attribute_id"
				v-show="comp.visible"
				@update_filters="updateFilters"></component>
			<hr />
		</li>
	</ul>
</template>

<script>
import { watchDebounced } from '@vueuse/core'

frappe.provide('webshop')

export default {
	name: 'FacetedSearch',
	props: {
		doctype: {
			type: String,
			required: true,
			default: 'Item',
		},
	},
	data() {
		return { searchComponents: [], filterValues: {}, sortOrder: '' }
	},
	mounted() {
		this.loadFacets()
	},
	methods: {
		toggleFilters(idx) {
			this.searchComponents[idx].visible = !this.searchComponents[idx].visible
		},
		updateFilters(values) {
			if ('sort_order' in values) {
				this.sortOrder = values
			} else {
				this.filterValues[values.attribute_name] = { attribute_id: values.attribute_id, values: values.values }
			}

			watchDebounced(
				this.filterValues,
				async (value, oldValue) => {
					await this.setFilterValues()
				},
				{ debounce: 500, maxWait: 1000 }
			)
		},
		loadFacets() {
			frappe
				.call({
					method: 'inventory_tools.inventory_tools.faceted_search.show_faceted_search_components',
					args: { doctype: this.doctype, filters: this.filterValues },
					headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token },
				})
				.then(r => {
					console.log(r)
					this.searchComponents = r.message
					for (const value of Object.values(r.message)) {
						this.updateFilters(value)
					}
				})
		},
		async setFilterValues() {
			if (webshop && window.cur_list == undefined) {
				frappe
					.xcall('webshop.webshop.api.get_product_filter_data', {
						query_args: { attributes: this.filterValues, sort_order: this.sortOrder },
					})
					.then(r => {
						let view_type = localStorage.getItem('product_view') || 'List View'
						if (!r.items) {
							return
						} else if (view_type == 'List View') {
							new webshop.ProductList({
								items: r.items,
								products_section: $('#products-list-area'),
								settings: r.settings,
								preference: view_type,
							})
						} else {
							new webshop.ProductGrid({
								items: r.items,
								products_section: $('#products-grid-area'),
								settings: r.settings,
								preference: view_type,
							})
						}
					})
			} else if (window.cur_list != undefined) {
				const items = await frappe.xcall('inventory_tools.inventory_tools.faceted_search.get_specification_items', {
					attributes: this.filterValues,
				})
				const listview = frappe.get_list_view(this.doctype)
				let filters = listview.filter_area.get()

				for (const [key, value] of Object.entries(this.filterValues)) {
					const values = value.values
					const attribute = Object.values(this.searchComponents).find(comp => comp.attribute_name === key)

					if (attribute.field) {
						if (Array.isArray(values)) {
							if (values.length > 0) {
								if (!values[0] && !values[1]) {
									// TODO: handle case where numeric range is unset
								} else {
									filters.push([this.doctype, attribute.field, 'in', values])
								}
							} else {
								filters = filters.filter(filter => filter[1] !== attribute.field)
							}

							this.refreshFilters(filters)
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
										filters.push([this.doctype, 'name', 'in', [...existing_name_filter_value, ...items]])
									} else {
										filters.push([this.doctype, 'name', 'in', [existing_name_filter_value, ...items]])
									}
								} else {
									filters.push([this.doctype, 'name', 'in', items])
								}

								this.refreshFilters(filters)
							}
						} else {
							// TODO: handle edge-case?
						}
					}
				}
			}
		},
		refreshFilters(filters) {
			const listview = frappe.get_list_view(this.doctype)
			listview.filter_area.clear(false)
			listview.filter_area.set(filters)
			listview.refresh()
		},
	},
}
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
