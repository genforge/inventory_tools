# Copyright (c) 2023, AgriTheory and contributors
# For license information, please see license.txt

import datetime
import json
import time

import frappe
from frappe.core.doctype.doctype.doctype import no_value_fields, table_fields
from frappe.model.document import Document
from frappe.utils.data import flt, get_datetime
from pytz import UnknownTimeZoneError, timezone


class Specification(Document):
	def validate(self):
		self.title = f"{self.dt}"
		if self.apply_on:
			self.title += f" - {self.apply_on}"

	def before_save(self):
		# get Specification attributes name based on parent which are in same order as newly updated attributes
		stored_attribute_names = set(
			frappe.get_all(
				"Specification Attribute", {"parent": self.name}, pluck="attribute_name", order_by="idx"
			)
		)
		new_attribute_names = {attr.attribute_name for attr in self.attributes}
		# get none matching attributes from each set
		old_name = list(stored_attribute_names - new_attribute_names)
		new_name = list(new_attribute_names - stored_attribute_names)

		# for will allow us to process changes done in multiple rows
		for index in range(0, len(old_name)):
			frappe.enqueue(
				update_specification_value_attribute_name, old_name=old_name[index], new_name=new_name[index]
			)

	def create_linked_values(self, doc, extra_attributes=None):
		for at in self.attributes:
			if at.field:
				existing_attribute_value = frappe.db.get_value(
					"Specification Value",
					{
						"reference_doctype": at.applied_on,
						"reference_name": doc.name,
						"attribute": at.attribute_name,
						"specification": self.name,
					},
				)
				if existing_attribute_value:
					av = frappe.get_doc("Specification Value", existing_attribute_value)
					av.value = frappe.get_value(av.reference_doctype, av.reference_name, at.field)
				else:
					av = frappe.new_doc("Specification Value")
					av.reference_doctype = at.applied_on
					av.reference_name = doc.name
					av.specification = self.name
					av.attribute = at.attribute_name
					av.field = at.field
				if at.date_values:
					av.value = convert_to_epoch(av.value)
				av.save()
			if extra_attributes and at.attribute_name in extra_attributes:
				if isinstance(extra_attributes[at.attribute_name], (str, int, float)):
					existing_attribute_value = frappe.db.get_value(
						"Specification Value",
						{
							"reference_doctype": at.applied_on,
							"reference_name": doc.name,
							"attribute": at.attribute_name,
						},
					)
					if existing_attribute_value:
						av = frappe.get_doc("Specification Value", existing_attribute_value)
					else:
						av = frappe.new_doc("Specification Value")
						av.reference_doctype = at.applied_on
						av.reference_name = doc.name
						av.attribute = at.attribute_name
					av.value = extra_attributes[at.attribute_name]
					if at.date_values:
						av.value = convert_to_epoch(av.value)
					av.save()
					continue

				if not extra_attributes:
					continue

				for value in extra_attributes[at.attribute_name]:  # list, tuple or set / not dict
					existing_attribute_value = frappe.db.get_value(
						"Specification Value",
						{
							"reference_doctype": at.applied_on,
							"reference_name": doc.name,
							"attribute": at.attribute_name,
							"value": value,  # this make this an add-only API
						},
					)
					if existing_attribute_value:
						av = frappe.get_doc("Specification Value", existing_attribute_value)
					else:
						av = frappe.new_doc("Specification Value")
						av.reference_doctype = at.applied_on
						av.reference_name = doc.name
						av.attribute = at.attribute_name
					av.value = value
					if at.date_values:
						av.value = convert_to_epoch(av.value)
					av.save()

	@property
	def applied_on_doctypes(self):
		return [r.applied_on for r in self.attributes]

	def applies_to(self, doc):
		if doc.doctype not in self.applied_on_doctypes:
			return
		for field in doc.meta.fields:
			if field.options == self.dt and not self.apply_on:
				return True
			if field.options == self.dt and doc.get(field.fieldname) == self.apply_on:
				return True


def update_specification_value_attribute_name(old_name, new_name):
	specification_values = frappe.get_all(
		"Specification Value", {"attribute": old_name}, pluck="name"
	)
	for specification_value in specification_values:
		frappe.db.set_value("Specification Value", specification_value, "attribute", new_name)


def convert_to_epoch(date):
	tzname = time.tzname if isinstance(time.tzname, (int, str)) else time.tzname[0]

	try:
		tz = timezone(tzname)
	except UnknownTimeZoneError:
		# default to beginning of epoch
		return

	d = datetime.datetime.now(tz)  # or some other local date
	utc_offset = d.utcoffset()
	if utc_offset:
		utc_offset_seconds = utc_offset.total_seconds()
		offset_d = (
			get_datetime(date) - datetime.timedelta(hours=12, seconds=int(utc_offset_seconds))
		) - get_datetime("1970-01-01")
		return offset_d.total_seconds()
	return


def convert_from_epoch(date):
	d = datetime.datetime.utcfromtimestamp(int(flt(date)))
	utc_offset = d.utcoffset().total_seconds() if d.utcoffset() else 0.0
	return (d + datetime.timedelta(hours=12, seconds=int(utc_offset))).date()


@frappe.whitelist()
def get_data_fieldnames(doctype):
	meta = frappe.get_meta(doctype)
	return sorted(
		f.fieldname for f in meta.fields if f.fieldtype not in no_value_fields + table_fields
	)


@frappe.whitelist()
def get_specification_values(reference_doctype, reference_name, specification=None):
	# to create new specification values
	if specification:
		rows = []
		specification_attributes = frappe.get_all(
			"Specification Attribute",
			{"parent": specification},
			["attribute_name as attribute", "applied_on", "field"],
		)
		for attribute in specification_attributes:
			value_string = ""
			if attribute.field:
				# dynamically get the field name of specification DocType
				fieldname = frappe.get_value(
					"DocField", {"parent": attribute.applied_on, "options": reference_doctype}, "fieldname"
				)
				# remove similar values using set
				attribute_values = set(
					frappe.get_all(attribute.applied_on, {fieldname: reference_name}, pluck=attribute.field)
				)
				for value in attribute_values:
					# avoid None or 0 value
					if value:
						value_string += str(value) + ", "
				value_string = value_string.strip(", ")
			rows.append({"attribute": attribute.attribute, "field": attribute.field, "value": value_string})
		return rows

	# to get existing specification value for each Item
	r = frappe.get_all(
		"Specification Value",
		filters={"reference_doctype": reference_doctype, "reference_name": reference_name},
		fields=["name AS row_name", "attribute", "value", "field", "specification"],
		order_by="attribute ASC, value ASC",
	)
	for row in r:
		date_values = frappe.get_value(
			"Specification Attribute",
			{"parent": row.specification, "attribute_name": row.attribute},
			["date_values"],
		)
		if date_values:
			row.value = convert_from_epoch(row.value)
	return r


@frappe.whitelist()
def create_specification_values(specification_reference, specifications):
	if isinstance(specifications, str):
		specifications = json.loads(specifications)
		specifications = [frappe._dict(**s) for s in specifications]
	for specification in specifications:
		frappe.enqueue(
			_create_specification_values,
			queue="short",
			specification_reference=specification_reference,
			specification=specification,
		)


@frappe.whitelist()
def update_specification_values(reference_doctype, reference_name, spec, specifications):
	if isinstance(specifications, str):
		specifications = json.loads(specifications)
		specifications = [frappe._dict(**s) for s in specifications]
	# convert dates to epoch
	existing_values = get_specification_values(reference_doctype, reference_name)
	for s in specifications:
		for row in existing_values:
			if row.row_name and row.row_name == s.row_name and row.value != s.value:
				date_values = frappe.get_value(
					"Specification Attribute", {"parent": spec, "attribute_name": s.attribute}, ["date_values"]
				)
				if date_values:
					s.value = convert_to_epoch(s.value)
				frappe.set_value("Specification Value", s.row_name, "value", s.value)
		if not s.row_name:
			av = frappe.new_doc("Specification Value")
			av.reference_doctype = reference_doctype
			av.reference_name = reference_name
			av.attribute = s.attribute
			av.specification = spec
			av.value = s.value
			# TODO:
			date_values = frappe.get_value(
				"Specification Attribute", {"parent": spec, "attribute_name": s.attribute}, ["date_values"]
			)
			if date_values:
				av.value = convert_to_epoch(av.value)
			av.save()


def _create_specification_values(specification_reference, specification):
	if not specification.value:
		return
	for value in specification.value.split(","):
		# TODO: identify and attach reference_doctype & reference_name
		frappe.get_doc(
			{
				"doctype": "Specification Value",
				"attribute": specification.attribute,
				"field": specification.field,
				"specification": specification_reference,
				"value": value.strip(),
			}
		).save()
