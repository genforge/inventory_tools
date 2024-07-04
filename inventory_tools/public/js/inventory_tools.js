import PlantFloor from './plant_floor/PlantFloor.vue'
import { createApp, reactive, ref, unref } from 'vue'

frappe.provide('inventory_tools')

inventory_tools.mount = frm => {
	$(frm.fields_dict['floor_layout'].wrapper).html($("<div id='plant-floor-layout'></div>").get(0))
	frm.$check_run = createApp(PlantFloor)
	frm.$check_run.mount('#plant-floor-layout')
}
