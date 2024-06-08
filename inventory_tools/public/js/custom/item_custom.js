frappe.provide('inventory_tools')

frappe.ui.form.on('Item', {
	refresh: frm => {
		add_specification_dialog(frm)
	},
})

function add_specification_dialog(frm) {
	// save before continuing
	frm.add_custom_button(
		__('Edit Specification'),
		() => {
			inventory_tools.specification_dialog(frm)
		},
		'Actions'
	)
}
