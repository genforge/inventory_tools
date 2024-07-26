// Copyright (c) 2024, AgriTheory and contributors
// For license information, please see license.txt

frappe.listview_settings['Specification Value'] = {
	refresh: listview => {
		console.log('this', listview)
	},
	hide_name_column: true,
}
