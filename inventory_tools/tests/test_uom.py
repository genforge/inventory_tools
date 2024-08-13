# Copyright (c) 2024, AgriTheory and contributors
# For license information, please see license.txt

import frappe
import pytest
from frappe.exceptions import ValidationError


@pytest.mark.order(40)
def test_uom_enforcement_validation():
	_so = frappe.get_last_doc("Sales Order")
	inventory_tools_settings = frappe.get_doc("Inventory Tools Settings", _so.company)
	inventory_tools_settings.enforce_uoms = True
	inventory_tools_settings.save()

	so = frappe.copy_doc(_so)
	assert so.items[0].uom == "Nos"
	so.items[0].uom = "Box"
	with pytest.raises(ValidationError) as exc_info:
		so.save()

	assert "Invalid UOM" in exc_info.value.args[0]


@pytest.mark.order(41)
def test_uom_enforcement_query():
	inventory_tools_settings = frappe.get_cached_doc(
		"Inventory Tools Settings", "Ambrosia Pie Company"
	)
	inventory_tools_settings.enforce_uoms = True
	inventory_tools_settings.save()
	inventory_tools_settings = frappe.get_cached_doc("Inventory Tools Settings", "Chelsea Fruit Co")
	inventory_tools_settings.enforce_uoms = True
	inventory_tools_settings.save()
	response = frappe.call(
		"frappe.desk.search.search_link",
		**{
			"doctype": "UOM",
			"txt": "",
			"query": "inventory_tools.inventory_tools.overrides.uom.uom_restricted_query",
			"filters": {"parent": "Parchment Paper"},
			"reference_doctype": "Purchase Order Item",
		},
	)
	assert len(response) == 2
	assert response[0].get("value") == "Nos"
	assert response[0].get("description") == "1.0"
	assert response[1].get("value") == "Box"
	assert response[1].get("description") == "100.0"
