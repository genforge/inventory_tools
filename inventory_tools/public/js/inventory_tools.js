import PlantFloor from './plant_floor/PlantFloor.vue'
import { createApp } from 'vue'

frappe.provide('inventory_tools')

inventory_tools.mount = frm => {
	$(frm.fields_dict['floor_layout'].wrapper).html($("<div id='plant-floor-layout'></div>").get(0))
	frm.plant_floor_layout = createApp(PlantFloor)
	frm.plant_floor_layout.mount('#plant-floor-layout')
}
