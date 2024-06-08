frappe.provide('inventory_tools')

inventory_tools.specification_dialog = async frm => {
	var data = []
	data = await get_specification_values(frm)
	let is_new = false
	if (!data.length) {
		is_new = true
	}
	let apply_on_fields = await get_apply_on_fields(frm)
	let current_spec = ''
	let attributes = get_attributes(data)
	if (data.length) {
		current_spec = data[0].specification
	}
	let fields = [
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
					default: frm.doc.doctype == 'Specification' ? frm.doc.name : current_spec,
					onchange: async () => {
						values = d.get_values()
						if (values && values.specification && is_new) {
							let _data = await get_specification_values(frm, values.specification)
							if (_data.length) {
								if (!d.fields_dict.specification.value) {
									d.set_value('specification', _data[0].specification)
								}
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
			],
			primary_action: () => {
				let values = d.get_values()
				if (!values) {
					return
				}
				validate_duplicate_attributes(values)
				frappe.xcall(
					'inventory_tools.inventory_tools.doctype.specification.specification.create_specification_values',
					{
						specification_reference: frm.doc.name,
						specifications: values.specs,
					}
				)
				resolve(d.hide())
			},
			primary_action_label: frm.doc.doctype == 'Specification' ? __('Generate') : __('Save'),
			size: 'large',
		})
		d.show()
		d.fields_dict.specification.get_query = () => {
			let filters = []
			apply_on_fields.map(spec => {
				let key = frappe.scrub(spec.dt, '_')
				if (spec.dt && spec.apply_on) {
					if (spec.apply_on == frm.doc[key]) {
						filters.push([key, '=', frm.doc[key]])
					} else {
						filters.push(['apply_on', '!=', spec.apply_on])
					}
				}
			})
			return {
				query: 'inventory_tools.inventory_tools.doctype.specification.specification.specification_query',
				filters: filters,
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
