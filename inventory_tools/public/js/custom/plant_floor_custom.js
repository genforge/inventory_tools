frappe.ui.form.on('Plant Floor', {
	onload_post_render: frm => {
		inventory_tools.mount(frm)
	},
	refresh: frm => {
		frm.page.wrapper.find('.layout-side-section').hide()
	},
})
