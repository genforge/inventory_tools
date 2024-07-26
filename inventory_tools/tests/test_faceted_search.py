# Copyright (c) 2024, AgriTheory and contributors
# For license information, please see license.txt

import frappe
import pytest

# don't generate spec values in setup
# create overlapping spec (Item)

# test generation of values for

# spec_items = frappe.get_all("Item", {"item_group": "Baked Goods"})
# for spec_item in spec_items:
# 	if spec_item.name not in attributes:
# 		continue
# 	spec_item = frappe.get_doc("Item", spec_item)
# 	s.create_linked_values(spec_item, attributes[spec_item.name])


def test_values_updated_on_item_save():
	# assert spec value doesn't exist
	frappe.flags.in_test = True
	values = frappe.get_all(
		"Specification Value", {"reference_doctype": "Item", "reference_name": "Double Plum Pie"}
	)
	assert values == []
	doc = frappe.get_doc("Item", "Double Plum Pie")
	doc.save()
	values = frappe.get_all(
		"Specification Value", {"reference_doctype": "Item", "reference_name": "Double Plum Pie"}
	)
	assert len(values) == 4
	doc.weight_per_unit = 12
	doc.save()
	values = frappe.get_all(
		"Specification Value",
		{"reference_doctype": "Item", "reference_name": "Double Plum Pie"},
	)
	assert len(values) == 4
	new_weight = frappe.get_all(
		"Specification Value",
		{"reference_doctype": "Item", "reference_name": "Double Plum Pie", "attribute": "Weight"},
		"value",
	)
	assert len(new_weight) == 1
	assert int(new_weight[0].value) == 12
	doc.weight_per_unit = 8
	doc.save()
	new_weight = frappe.get_all(
		"Specification Value",
		{"reference_doctype": "Item", "reference_name": "Double Plum Pie", "attribute": "Weight"},
		"value",
	)
	assert len(new_weight) == 1
	assert int(new_weight[0].value) == 8
	values = frappe.get_all(
		"Specification Value", {"reference_doctype": "Item", "reference_name": "Double Plum Pie"}
	)
	assert len(values) == 4
	# cleanup
	for value in values:
		frappe.delete_doc("Specification Value", value.name, force=True)


def test_generate_values():
	frappe.flags.in_test = True
	doc = frappe.get_doc("Specification", "Items")
	assert len(doc.attributes) == 3
	frappe.call(
		"inventory_tools.inventory_tools.doctype.specification.specification.create_specification_values",
		**{
			"spec": doc.name,
			"specifications": [
				{
					"attribute": a.attribute_name,
					"field": a.field,
				}
				for a in doc.attributes
			],
		}
	)
	assert (
		len(frappe.get_all("Specification Value", {"specification": doc.name})) == 36 * 2
	)  # total items x computed attributes


def test_generate_values_on_overlapping_items():
	frappe.flags.in_test = True
	doc = frappe.get_doc("Specification", "Baked Goods")
	assert len(doc.attributes) == 4
	frappe.call(
		"inventory_tools.inventory_tools.doctype.specification.specification.create_specification_values",
		**{
			"spec": doc.name,
			"specifications": [
				{
					"attribute": a.attribute_name,
					"field": a.field,
				}
				for a in doc.attributes
			],
		}
	)
	assert (
		len(frappe.get_all("Specification Value", {"specification": doc.name})) == 6 * 2
	)  # total items x computed attributes


def test_delete_of_specification_value():
	frappe.flags.in_test = True
	# via update_specification_values
