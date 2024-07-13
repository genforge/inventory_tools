# Copyright (c) 2024, AgriTheory and contributors
# For license information, please see license.txt

import datetime
import json

import frappe
from erpnext.manufacturing.doctype.workstation.workstation import Workstation
from frappe.utils.data import comma_and, flt, get_time, time_diff_in_hours


class InventoryToolsWorkstation(Workstation):
	def validate_working_hours(self, row):
		if not (row.start_time and row.end_time):
			frappe.throw(frappe._("Row #{0}: Start Time and End Time are required").format(row.idx))

		if get_time(row.start_time) >= get_time(row.end_time):
			frappe.msgprint(
				frappe._("Row #{0}: End Time of {1} will be interpreted as occurring on the next day").format(
					row.idx, row.end_time
				)
			)

	def set_total_working_hours(self):
		self.total_working_hours = 0.0
		for row in self.working_hours:
			self.validate_working_hours(row)

			if row.start_time and row.end_time:
				if get_time(row.start_time) >= get_time(row.end_time):
					end_time = datetime.datetime.combine(
						datetime.date.today(), get_time(row.end_time)
					) + datetime.timedelta(hours=24)
					start_time = datetime.datetime.combine(datetime.date.today(), get_time(row.start_time))
					row.hours = flt(time_diff_in_hours(end_time, start_time), row.precision("hours"))
				else:
					row.hours = flt(time_diff_in_hours(row.end_time, row.start_time), row.precision("hours"))
				self.total_working_hours += row.hours

	def validate_overlap_for_operation_timings(self):
		for d in self.get("working_hours"):
			existing = frappe.db.sql_list(
				"""select idx from `tabWorkstation Working Hour`
				where parent = %s and name != %s
					and (
						(start_time between %s and %s) or
						(end_time between %s and %s) or
						(%s between start_time and end_time))
				""",
				(self.name, d.name, d.start_time, d.end_time, d.start_time, d.end_time, d.start_time),
			)

			if existing:
				frappe.msgprint(
					frappe._("Row #{0}: May overlap with row {1}").format(d.idx, comma_and(existing)),
				)


"""
	This function fetch workstation of the document operation.
	In Operation you can select multiple workstations in Alternative Workstation field.
	In the Work Order, Operation table, and Jobcard, there exists an operation field.
	When selecting an operation, this function is responsible for fetching the workstations
	both from the Alternative Workstation and the default workstation.

	Example : 	Operation : Cool Pie Op
				Default Workstation: Cooling Racks Station
				Alternative Workstation:
						`````````````````````````````````````````````````````
						:	Cooling Station	, Refrigerator Station ,		:
						:													:
						:													:
						``````````````````````````````````````````````````````
				In work order and job card when you select operation Cool Pie Op then you find below workstation in workstation field
							:	Cooling Station			:
							:	Refrigerator Station	:
							:	Cooling Racks Station	:
"""


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_alternative_workstations(doctype, txt, searchfield, start, page_len, filters):
	operation = filters.get("operation")
	if not operation:
		frappe.throw("Please select a Operation first.")

	if txt:
		searchfields = frappe.get_meta(doctype).get_search_fields()
		searchfields = " or ".join(["ws." + field + f" LIKE '%{txt}%'" for field in searchfields])

	conditions = ""
	if txt and searchfields:
		conditions = f"and ({searchfields})"

	workstation = frappe.db.sql(
		"""
		Select aw.workstation, ws.workstation_type, ws.description
		From `tabOperation` as op
		Left Join `tabAlternative Workstations` as aw ON aw.parent = op.name
		Left Join `tabWorkstation` as ws ON ws.name = aw.workstation
		Where op.name = '{operation}' {conditions}
	""".format(
			conditions=conditions, operation=operation
		)
	)

	default_workstation = frappe.db.get_value("Operation", operation, "workstation")
	flag = True
	for row in workstation:
		if row[0] == None:
			workstation = ((default_workstation,),)
			flag = False
	if flag:
		workstation += ((default_workstation,),)
	return workstation
