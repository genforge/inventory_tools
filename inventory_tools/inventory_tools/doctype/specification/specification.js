// Copyright (c) 2023, AgriTheory and contributors
// For license information, please see license.txt

frappe.ui.form.on('Specification', {
	refresh: frm => {
		add_specification_dialog(frm)
	},
})

frappe.ui.form.on('Specification Attribute', {
	applied_on: (frm, cdt, cdn) => {
		get_data_fieldnames(frm, cdt, cdn)
	},
	form_render: (frm, cdt, cdn) => {
		get_data_fieldnames(frm, cdt, cdn)
	},
})

function get_data_fieldnames(frm, cdt, cdn) {
	let row = locals[cdt][cdn]
	if (!row.applied_on) {
		return
	}
	frappe
		.xcall('inventory_tools.inventory_tools.doctype.specification.specification.get_data_fieldnames', {
			doctype: row.applied_on,
		})
		.then(r => {
			if (!r) {
				return
			}
			frm.set_df_property('attributes', 'options', r, frm.doc.name, 'field', row.name)
			frm.refresh_field('attributes')
		})
}

function add_specification_dialog(frm) {
	// save before continuing
	frm.add_custom_button(
		'Generate Specification Values',
		() => {
			specification_dialog(frm)
		},
		'Actions'
	)
}

async function specification_dialog(frm) {
	const data = await get_specification_values(frm)
	let attributes = data.map(r => r.attribute)
	let fields = [
		{
			fieldtype: 'Select',
			fieldname: 'attribute',
			in_list_view: 1,
			read_only: 0,
			disabled: 0,
			label: __('Attribute'),
			options: attributes,
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
			label: __('Value (comma separated)'),
			in_list_view: 1,
			read_only: 0,
		},
	]
	return new Promise(resolve => {
		let d = new frappe.ui.Dialog({
			title: __('Generate Specification Values'),
			fields: [
				{
					label: __('Specification'),
					fieldname: 'specification',
					fieldtype: 'Link',
					options: 'Specification',
					default: frm.doc.name,
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
					reqd: 1,
					data: data,
					get_data: () => get_specification_values(frm),
					fields: fields,
				},
			],
			primary_action: () => {
				let values = d.get_values()
				if (!values) {
					return
				}
				frappe.xcall(
					'inventory_tools.inventory_tools.doctype.specification.specification.create_specification_values',
					{
						specification_reference: frm.doc.name,
						specifications: values.specs,
					}
				)
				resolve(d.hide())
			},
			primary_action_label: __('Save'),
			size: 'large',
		})
		d.show()
	})
}

async function get_specification_values(frm) {
	let r = await frappe.xcall(
		'inventory_tools.inventory_tools.doctype.specification.specification.get_specification_values',
		{
			reference_doctype: frm.doc.dt,
			reference_name: frm.doc.apply_on,
			specification: frm.doc.name
		}
	)
	return r
}
