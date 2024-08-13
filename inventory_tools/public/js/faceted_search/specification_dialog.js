// Copyright (c) 2024, AgriTheory and contributors
// For license information, please see license.txt

frappe.provide('inventory_tools')

inventory_tools.specification_dialog = async frm => {
	var data = []
	data = await get_specification_values(frm)
	let is_new = false
	if (!data.length) {
		is_new = true
	}
	let apply_on_fields = await get_apply_on_fields(frm)
	let attributes = get_attributes(data)
	let fields = [
		{
			fieldtype: 'Data',
			fieldname: 'specification',
			label: __('Specification'),
			in_list_view: 1,
			read_only: 1,
		},
		{
			fieldtype: 'Select',
			fieldname: 'attribute',
			in_list_view: 1,
			read_only: 0,
			disabled: 0,
			label: __('Attribute'),
			options: attributes,
			onchange: a => {
				validate_duplicate_attributes()
			},
		},
		{
			fieldtype: 'Data',
			fieldname: 'field',
			label: __('Field'),
			in_list_view: 1,
			read_only: 1,
		},
		{
			fieldtype: 'Data',
			fieldname: 'value',
			label: __('Value'),
			in_list_view: 1,
			read_only: 0,
		},
	]
	return new Promise(resolve => {
		let d = new frappe.ui.Dialog({
			title: frm.doc.doctype == 'Specification' ? __('Generate Specification Values') : __('Edit Specification Values'),
			fields: [
				{
					label: __('Specification'),
					fieldname: 'specification',
					fieldtype: 'Link',
					options: 'Specification',
					read_only: frm.doc.doctype == 'Specification' ? 1 : 0,
					default: frm.doc.doctype == 'Specification' ? frm.doc.name : '',
					onchange: async () => {
						values = d.get_values()
						if (values) {
							let _data = await get_specification_values(frm, values.specification)
							if (_data.length) {
								d.fields_dict.specs.grid.df.data = []
								data = _data
								d.fields_dict.specs.grid.docfields[0].options = get_attributes(data)
								_data.forEach((row, index) => {
									row.value = ''
									if (row.field && frm.doc[row.field]) {
										row.value = frm.doc[row.field]
									}
									d.fields_dict.specs.grid.df.data.push({
										name: `row-${index}`,
										idx: d.fields_dict.specs.grid.df.data.length + 1,
										__islocal: true,
										...row,
									})
								})
								d.fields_dict.specs.grid.refresh()
								_data.forEach((row, index) => {
									let grid_row = d.fields_dict.specs.grid.get_row(`row-${index}`)
									if (row.field) {
										grid_row.set_field_property('attribute', 'read_only', 1)
									}
									grid_row.refresh()
								})
							}
							d.$wrapper.find('.grid-add-row').show()
						}
					},
				},
				{
					fieldtype: 'Column Break',
					fieldname: 'col_break_1',
				},
				{
					fieldtype: 'Section Break',
					fieldname: 'section_break_1',
				},
				{
					fieldname: 'specs',
					fieldtype: 'Table',
					in_place_edit: true,
					editable_grid: true,
					data: data,
					fields: fields,
				},
				{
					fieldtype: 'HTML',
					fieldname: 'table-notes',
					options: __('<p>To remove a non-computed value, remove the contents of the "Value" field</p>'),
				},
			],
			primary_action: () => {
				let values = d.get_values()
				if (!values) {
					return
				}
				validate_duplicate_attributes(values)
				let method = 'inventory_tools.inventory_tools.doctype.specification.specification.update_specification_values'
				if (frm.doc.doctype == 'Specification') {
					method = 'inventory_tools.inventory_tools.doctype.specification.specification.create_specification_values'
				}
				frappe.xcall(method, {
					spec: frm.doc.doctype == 'Specification' ? frm.doc.name : values.specification,
					specifications: values.specs,
					reference_doctype: frm.doc.doctype == 'Specification' ? '' : frm.doc.doctype,
					reference_name: frm.doc.doctype == 'Specification' ? '' : frm.doc.name,
				})
				resolve(d.hide())
			},
			primary_action_label: frm.doc.doctype == 'Specification' ? __('Generate') : __('Save'),
			size: 'extra-large',
		})
		d.show()
		d.fields_dict.specification.get_query = () => {
			return {
				query: 'inventory_tools.inventory_tools.doctype.specification.specification.specification_query',
				filters: {
					reference_doctype: frm.doc.doctype,
					reference_name: frm.doc.name,
				},
			}
		}
		let values = d.get_values()
		if (values && values.specification) {
			d.$wrapper.find('.grid-add-row').show()
		} else {
			d.$wrapper.find('.grid-add-row').hide()
		}
	})
}

async function get_specification_values(frm, specification = null) {
	let args = {}
	if (frm.doc.doctype == 'Specification') {
		args = {
			reference_doctype: frm.doc.dt,
			reference_name: frm.doc.apply_on,
			specification: frm.doc.name,
		}
		return frm.doc.attributes.map(row => {
			return {
				attribute: row.attribute_name,
				field: row.field,
				value: null,
			}
		})
	} else {
		args = {
			reference_doctype: frm.doc.doctype,
			reference_name: frm.doc.name,
			specification: specification,
		}
		return await frappe.xcall(
			'inventory_tools.inventory_tools.doctype.specification.specification.get_specification_values',
			args
		)
	}
}

function validate_duplicate_attributes(values = null) {
	if (!values) {
		values = cur_dialog.get_values()
	}
	const attributes = values.specs.filter(i => {
		if (i.attribute && i.field) {
			return i.attribute
		}
	})
	let is_duplicate = attributes.some((item, idx) => {
		return attributes.indexOf(item) != idx
	})
	if (is_duplicate) {
		frappe.throw(__('Field level duplicates are not permitted in a Specification'))
	}
}

function get_attributes(data) {
	if (!data) {
		return
	}
	let r = Array.from(
		new Set(
			data.map(r => {
				if (r.attribute && !r.field) {
					return r.attribute
				}
			})
		)
	).sort()
	r.pop(undefined)
	return r
}

async function get_apply_on_fields(frm) {
	return await frappe.xcall('inventory_tools.inventory_tools.doctype.specification.specification.get_apply_on_fields', {
		doctype: frm.doc.doctype,
	})
}
