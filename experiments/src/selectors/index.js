import { createSelector } from 'reselect'
import _ from 'lodash'

export const getLoading = state => state.data.loading

const getAllData = state => state.data.all
export const getAllSelected = type => state => state[type].selected

const getColumns = type => state => state[type].columns
export const getColumnNames = type => state => getColumns(type)(state).map(c => c.name)

export const getData = type => type === 'demographics' ? getAllData : createSelector(
	[ getAllData ],
	data =>	_.filter(data, {'dem1': 'org', 'dem2': null})
)

const getPlotData = type => createSelector(
	[ getData(type), getAllSelected(type) ],
	(data, allSelected) => _.filter(data, allSelected)
)

const getSelected = (type, column) => createSelector(
	[ getAllSelected(type) ],
	allSelected => _.pick(allSelected, column)
)

const getAllOrgs = createSelector(
	[ getData('experiments'), getSelected('experiments', 'election') ],
	(data, selectedElection) => _.filter(data, { ...selectedElection, dem1_value: 'all'}) 
)

export const getExperimentsPlotData = createSelector(
	[ getPlotData('experiments'), getAllOrgs ],
	(filteredData, allOrgs) => [ ...filteredData, ...allOrgs ]
		.map(d => ({ ...d, x: d.dem1_value }))
)

export const getDemographicsPlotData = createSelector(
	[ getPlotData('demographics'), getAllSelected('demographics') ],
	(data, allSelected) => !allSelected.dem2 ?
			data.map(d => ({ ...d, x: d.dem1_value })) :
			data.map(d => ({ ...d, x: (d.dem1_value + ' / ' + d.dem2_value) }))
)

export const getElectionGroupSizes = type => createSelector(
	[ getAllData, getSelected(type, 'election') ],
	(data, election) => _.filter(data, { ...election, dem2: null })
		.map(d => _.pick(d, ['control_pop', 'treatment_pop']))
		.reduce((a, b) => ({
			control_pop: a.control_pop + parseInt(b.control_pop, 10),
			treatment_pop: a.treatment_pop + parseInt(b.treatment_pop, 10)
		}), {control_pop: 0, treatment_pop: 0})
)

// take data, get first column (sorted by sum of control_pop), store
// filter data over first column, get second column (sorted by sum of control_pop), store
// keep going (okay there's no way anyone's gonna be able to this)
const capitalize = string => string.charAt(0).toUpperCase() + string.substr(1)

const getOrderedSelected = type => createSelector(
	[ getColumns(type), getAllSelected(type) ],
	(columns, allSelected) => columns.map(c => ({ ...c, selected: allSelected[c.name]}))
)

const deriveDropdownOptions = (data, selected) => selected.reduce(
	(a, b) => {
		let { data: currentData, dropdownOptions } = a
		let dropdownTexts = _.chain(currentData)
			.groupBy(b.name)
			.mapValues(v => _.sumBy(v, 'control_pop'))
			.toPairs()
			.sortBy(x => 1 / (x[1] + 1)) // sort by descending, account for any possible zeros in denominator
			.flatMap(x => x[0])
			.value()
		let newDropdownOptions = dropdownTexts.map(d => ({key: d, text: capitalize(d), value: d}))
		return {
			data: _.filter(currentData, {[b.name]: b.selected}),
			dropdownOptions: [
				...dropdownOptions, 
				{ ...b, selected: b.selected && capitalize(b.selected), options: newDropdownOptions }
			]
		}
	},
	{ data, 'dropdownOptions': [] }
	).dropdownOptions


export const getDropdownOptions = type => createSelector(
	[ getData(type), getOrderedSelected(type) ],
	deriveDropdownOptions
)