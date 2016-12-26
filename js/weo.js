/*
Copyright 2016-2017 Rasko Leinonen

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";

// http://www.imf.org/external/pubs/ft/weo/2016/02/weoData/download.aspx

var weoFile = "data/WEOOct2016all.xls";

var weoColumn =
{
	countryCode       : "ISO", // ISO three letter country code
	subjectCode       : "WEO Subject Code",
	country           : "Country",
	subject           : "Subject Descriptor",
	subjectNote       : "Subject Notes",
	unit              : "Units",
	scale             : "Scale",
	note              : "Country/Series-specific Notes",
	estimateStartYear : "Estimates Start After"
}

var constant =
{
	startYear: 1980,
	endYear: 2015,
	maxCountries: 20,
	minYears: 5,
	highestOrLowestCountries: 10
}

var region = initRegion();

var weoData,        // All data from weoFile.
	weoCountryData, // Unique country data from weoFile.
	weoSubjectData, // Unique subject data from weoFile.	
	yearData = Array.apply(null, Array(constant.endYear - constant.startYear + 1)).map(
		function (_, i) { return constant.startYear + i; })

var margin = {top: 100, right: 200, bottom: 100, left:100, label:25 }
var	width = 960 - margin.left - margin.right,
	height = 600 - margin.top - margin.bottom

var plot = {
	seriesColorList: d3.scaleOrdinal(d3.schemeCategory20)
		.domain([0,constant.maxCountries-1]),
	seriesColorMap: {},
	seriesStrokeWidth: "4px",
	seriesStrokeOpacity: 0.65,
	seriesHighlightStrokeWidth: "4px",
	seriesHighlightStrokeOpacity: 1,
	seriesUnHighlightStrokeOpacity: 0.1,
	seriesMarkerRadius: "6px",
	seriesHighlightMarkerRadius: "6px",
	seriesHighlightTransitionDuration: 750,	
	seriesLegendTextFontFamily: "sans-serif",
	seriesLegendTextFontSize: "12px",
	seriesLegendTextFontWeight: "normal",
	axisFontFamily: "sans-serif",
	axisFontSize: "14px",
	axisFontFamily: "sans-serif",
	axisLabelFontSize: "14px",
	axisLabelFontFamily: "sans-serif",
	titleFontSize: "14px",
	titleFontFamily: "sans-serif",
	defaultTransitionDuration: 750,
	defaultTransitionEase: d3.easeCubicOut,
	svg: null,
	seriesPaths: null,
	xAxisBottom: null,
	xAxisBottomGroup: null,
	xAxisBottomClass: "xAxisBottom",
	xAxisOrigin: null,
	xAxisOriginGroup: null,	
	xAxisGrid: null,	
	xAxisGridGroup: null,
	xAxisGridClass: "xAxisGrid",
	yAxis: null,
	yAxisGroup: null,
	xAxisLabel: null,
	yAxisLabel: null,
	title: null,
	seriesLegendGroup: null
}

var RefreshType = {
	YEAR: 'YEAR',
	SUBJECT: 'SUBJECT',
	COUNTRY: 'COUNTRY',
	REGION: 'REGION',
	ALL: 'ALL',
	TOP: 'TOP',
	BOTTOM: 'BOTTOM'
}

d3.queue()
  .defer(d3.tsv, weoFile)
  .awaitAll(function(error, results) {
    if (error) { console.log(error); throw error; }

	weoData = results[0];

	init();
		
	refresh(RefreshType.ALL);
  }); 

function init() {
	console.log("init");
	checkRequiredValue(weoData);		
		
	var widthWithMargins = width + margin.left + margin.right;
	var heightWithMargins = height + margin.top + margin.bottom;

	// Append svg element.	
	plot.svg = d3.select("body").append("svg")
		.attr("width", widthWithMargins)
		.attr("height", heightWithMargins)
		.append("g")
		.attr("transform",
			  "translate(" + margin.left + "," + margin.top + ")")

	// Append a clipPath element to the group element to show
	// only the visible part of the series.
	plot.svg.append("clipPath")
		.attr("id", "series-clip")
		.append("rect")
		.attr("x", 0)
		.attr("y", 0 - margin.top)
		.attr("width", width)
		.attr("height", heightWithMargins)

	// Init country and subject data.
	
	weoCountryData = getUniqueData(weoData, 
		weoColumn.countryCode, [weoColumn.countryCode, weoColumn.country]);
	//console.log("weoCountryData: ", weoCountryData);
	
	weoSubjectData = getUniqueData(weoData, 
		weoColumn.subjectCode, [weoColumn.subjectCode, weoColumn.subject, weoColumn.unit, weoColumn.scale]);
	//console.log("weoSubjectData: ", weoSubjectData);
	
	initCountrySelector(['VEN', 'USA']);
	initRegionSelector();
	initSubjectSelector('BCA');
	initYearSelector();
	initHighestLowestSelector();
}

/** Initialises the country selector. May be initialized
 * any number of times. 
 */
function initCountrySelector(countryCodeArray) {
	console.log("initCountrySelector")
	checkRequiredValue(countryCodeArray);

	if ($("#countrySelector").children().length === 0) {
		$("#countrySelector").change(function() {
			refresh(RefreshType.COUNTRY);
		});
	}
	
	$("#countrySelector").empty();

	initSelector(
		'countrySelector', 
		weoCountryData, 
		getSelectedData(weoCountryData, weoColumn.countryCode, countryCodeArray),
		function(d) { return d[weoColumn.countryCode]; },
		function(d) { return d[weoColumn.country]; },
		{ maximumSelectionLength: constant.maxCountries } );

}

/** Initialises the region selector. May be called only once.
 */
function initRegionSelector() {
	console.log("initRegionSelector")
	
	$('#regionSelector').prepend('<option></option>');
	
	initSelector(
		'regionSelector', 
		Object.keys(region),
		null,
		function(d) { return d },
		function(d) { return d },
		{ placeholder: "Please select a region", allowClear: true }
	);

	$("#regionSelector").change(function() {
		refresh(RefreshType.REGION);
	});
}

function initSubjectSelector(subjectCode) {
	console.log("initSubjectSelector")		
	initSelector(
		'subjectSelector', 
		weoSubjectData,
		getSelectedData(weoSubjectData, weoColumn.subjectCode, subjectCode),
		function(d) { return d[weoColumn.subjectCode]; },
		function(d) { return d[weoColumn.subject] + " as " + d[weoColumn.unit] + " (" + d[weoColumn.subjectCode] + ")"; } );

	$("#subjectSelector").change(function() {
		refresh(RefreshType.SUBJECT);
	});
}

function initYearSelector() {
	initSelector(
		'fromYearSelector', 
		yearData, 
		constant.startYear,		
		function(d) { return d; },
		function(d) { return d; } );

	initSelector(
		'toYearSelector', 
		yearData, 
		constant.endYear,		
		function(d) { return d; },
		function(d) { return d; } );
		
	$("#fromYearSelector").change(function() {
		var fromYear = +$("#fromYearSelector").val();
		var toYear = +$("#toYearSelector").val();
		if (fromYear + constant.minYears > toYear) {
			fromYear = Math.max(constant.startYear, toYear - constant.minYears);
			// console.log("Adjusting from year: ", fromYear);
			$("#fromYearSelector").val(fromYear);
			$("#fromYearSelector").change();
		}
		else {
			refresh(RefreshType.YEAR);
		}
	});
		
	$("#toYearSelector").change(function() {
		var fromYear = +$("#fromYearSelector").val();
		var toYear = +$("#toYearSelector").val();
		//console.log("From year: ", fromYear);
		//console.log("To year: ", toYear);
		if (fromYear + constant.minYears > toYear) {
			toYear = Math.min(constant.endYear, fromYear + constant.minYears);
			console.log("Adjusting to year: ", toYear);
			$("#toYearSelector").val(toYear);			
			$("#toYearSelector").change();
		}
		else {
			refresh(RefreshType.YEAR);
		}
	});	
}

function initHighestLowestSelector() {
	$("#highestCountrySelector").click(function() {
		refresh(RefreshType.TOP);
	});

	$("#lowestCountrySelector").click(function() {
		refresh(RefreshType.BOTTOM);
	});	
}

function refresh(refreshType) {
	console.log("refresh", refreshType);	
	checkRequiredValue(refreshType, "string");	

	var subjectSelection = getSelectedData(weoSubjectData, 
		weoColumn.subjectCode, $('#subjectSelector').val())[0];
	
	var fromYearSelection = +$("#fromYearSelector").val();	
	var toYearSelection = +$("#toYearSelector").val();
	
	var subjectData = filterWeoDataBySubject(weoData, subjectSelection);

	if (refreshType === RefreshType.TOP ||
		refreshType === RefreshType.BOTTOM) {
		var data = orderSubjectDataByValue(subjectData,
			fromYearSelection, toYearSelection, refreshType);
		var countryCodeArray = data.slice(0, constant.highestOrLowestCountries).map(
			function(d) { return d[weoColumn.countryCode] });		
		initCountrySelector(countryCodeArray);
	}
	else if (refreshType === RefreshType.REGION) {
		var regionSelection = $("#regionSelector").val();
		var countryCodeArray = region[regionSelection];
			initCountrySelector(countryCodeArray);
	}
	
	var countrySelection = getSelectedData(weoCountryData, 
		weoColumn.countryCode, $('#countrySelector').val() );    
		
	// console.log("countrySelection: ", countrySelection);
	// console.log("subjectSelection: ", subjectSelection);
	// console.log("fromYearSelection: ", fromYearSelection);
	// console.log("toYearSelection: ", toYearSelection);
	
	var subjectCode = subjectSelection[weoColumn.subjectCode];
	var subject = subjectSelection[weoColumn.subject];
	var unit = subjectSelection[weoColumn.unit];
	var scale = subjectSelection[weoColumn.scale];
		
	// console.log("subjectCode: ", subjectCode);
	// console.log("subject: ", subject);
	// console.log("unit: ", unit);

	// Get data to display

	var data = []
	countrySelection.forEach(function(d) {
		var seriesData = filterSubjectDataByCountry(subjectData, d)
		if (seriesData != null) {
			data.push(seriesData)
		}
	})

	setSeriesColor(data)
	
	// console.log("Data", data);
	
	var xVisibleValues = [];
	var yVisibleValues = [0];
	
	data.forEach(function(seriesData) {
		seriesData.values.forEach(function(d) {
			var year = d.x.getFullYear();
			if (year >= fromYearSelection &&
    			year <= toYearSelection) {
				xVisibleValues.push(d.x)
				yVisibleValues.push(d.y)
				seriesData.seriesLegendY = d.y
			}
		})
	})
			
	var visibleX = d3.scaleTime().range([0, width]).domain(d3.extent(xVisibleValues));
	var visibleY = d3.scaleLinear().range([height, 0]).domain(d3.extent(yVisibleValues));

	plotXAxisOrigin(visibleX, visibleY);
	plotSeries(data, visibleX, visibleY, fromYearSelection, toYearSelection, refreshType);
	plotXAxisBottom(visibleX);
	plotXAxisGrid(visibleX);
	plotYAxis(visibleY);
	plotTitle(subject, subjectCode);
	plotXAxisLabel();
	plotYAxisLabel(unit, scale);
	plotSeriesLegend(data, visibleY);
}

function setSeriesColor(data) {	
	Object.keys(plot.seriesColorMap).forEach(function(p) {
		if (null == data.find(function(d) { return p === d[weoColumn.countryCode] }) ) {
			delete plot.seriesColorMap[p]
		}
	})

	data.forEach(function(d) {
		var countryCode = d[weoColumn.countryCode]
		if (plot.seriesColorMap[countryCode] == null) {
			var colorIndex =
				d3.range(plot.seriesColorList.domain()[0],plot.seriesColorList.domain()[1]+1).find(function(colorIndex) {
					return !Object.keys(plot.seriesColorMap).find(function(countryCode) {
						return colorIndex === plot.seriesColorMap[countryCode].colorIndex
					})
				})
			var color = plot.seriesColorList(colorIndex)
			plot.seriesColorMap[countryCode] = {colorIndex: colorIndex, color: color }
		}
		d.seriesColor = plot.seriesColorMap[countryCode].color
	})
}

function plotXAxisLabel() {
	if (plot.xAxisLabel == null) {
		plot.xAxisLabel = plot.svg.append("text")
			.attr("y", height + 50)
			.attr("x", width / 2)
			.style("text-anchor", "middle")
			.style("font-size", plot.axisLabelFontSize)
			.style("font-family", plot.axisLabelFontFamily)
            .text("Year")
	}
}

function plotYAxisLabel(unit, scale) {
	checkRequiredValue(unit, "string");
	checkRequiredValue(scale, "string");

	if (plot.yAxisLabel == null) {
		plot.yAxisLabel = plot.svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 0 - margin.left + margin.label)
		.attr("x",0 - (height / 2))
		.style("text-anchor", "middle")
		.style("font-size", plot.axisLabelFontSize)
		.style("font-family", plot.axisLabelFontFamily)
	}
	
	plot.yAxisLabel.text(unit + " " + scale);
}

function plotTitle(subject, subjectCode) {
	checkRequiredValue(subject, "string");
	checkRequiredValue(subjectCode, "string");
		
	if (plot.title == null) {
		plot.title = plot.svg.append("text")
			.attr("y", - margin.label)
			.attr("x", width / 2)
			.style("text-anchor", "middle")
  			.style("font-size", plot.titleFontSize)
			.style("font-family", plot.titleFontFamily)
	}

	plot.title.text( subject + " (" + subjectCode + ")" );
}

function plotXAxisGrid(visibleX) {
	checkRequiredValue(visibleX);

	if (plot.xAxisGridGroup == null) {
		plot.xAxisGrid = d3.axisBottom(visibleX)
			.tickSize(-height, 0, 0)
			.tickFormat("")
		plot.xAxisGridGroup = plot.svg.append("g")
			.attr("class", plot.xAxisGridClass)
			.attr("transform", "translate(0," + height + ")")
			.call(plot.xAxisGrid)
	}
	else {
		plot.xAxisGrid.scale(visibleX)		
		plot.xAxisGridGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.call(plot.xAxisGrid)
	}
}

function plotXAxisOrigin(visibleX, visibleY) {
	checkRequiredValue(visibleX);
	checkRequiredValue(visibleY);

	if (plot.xAxisOriginGroup == null) {
		plot.xAxisOrigin = d3.axisBottom(visibleX)
			.tickFormat("")
		plot.xAxisOriginGroup = plot.svg.append("g")
			.attr("transform", "translate(0," + visibleY(0) + ")")
			.call(plot.xAxisOrigin)
	}
	else {
		plot.xAxisOrigin.scale(visibleX)
		plot.xAxisOriginGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.attr("transform", "translate(0," + visibleY(0) + ")")					
			.call(plot.xAxisOrigin)
	}
}

function plotXAxisBottom(visibleX) {
	checkRequiredValue(visibleX);

	if (plot.xAxisBottomGroup == null) {
		plot.xAxisBottom = d3.axisBottom(visibleX)
		plot.xAxisBottomGroup = plot.svg.append("g")
			.attr("class", plot.xAxisBottomClass)		
			.attr("transform", "translate(0," + height + ")")
  			.style("font-size", plot.axisFontSize)
			.style("font-family", plot.axisFontFamily)
			.call(plot.xAxisBottom)
	}
	else {
		plot.xAxisBottom.scale(visibleX)
		plot.xAxisBottomGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.call(plot.xAxisBottom)
	}	
}

function plotYAxis(visibleY) {
	checkRequiredValue(visibleY);
	
	if (plot.yAxisGroup == null) {
		plot.yAxis = d3.axisLeft(visibleY);	
		plot.yAxisGroup = plot.svg.append("g")
  			.style("font-size", plot.axisFontSize)
			.style("font-family", plot.axisFontFamily)		
			.call(plot.yAxis);			
	}
	else {
		plot.yAxis.scale(visibleY);
		plot.yAxisGroup
    	    .transition()
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.call(plot.yAxis);
	}
}

function plotSeries(data, visibleX, visibleY, fromYearSelection, toYearSelection, refreshType) {
	checkRequiredValue(data);
	checkRequiredValue(visibleX);
	checkRequiredValue(visibleY);
	checkRequiredValue(fromYearSelection);
	checkRequiredValue(toYearSelection);
	checkRequiredValue(refreshType);
	// startYear                              endYear
	//     ^                                   ^
	//     |-------------totalWidth------------|
	//     |-a-|-------width-------|-----------|
	//         v                   v 
	//      fromYear             toYear
	//		   0
	//
	// a = (fromYear-startYear) / (endYear-startYear) * totalWidth 
		
	var totalWidth = width * (constant.endYear - constant.startYear) / 
		(toYearSelection - fromYearSelection);

	var a = (fromYearSelection - constant.startYear) / 
		(constant.endYear - constant.startYear) * totalWidth;
	
	var parseTime = d3.timeParse("%Y");
	
	var allX = d3.scaleTime().range([-a,totalWidth-a]).domain(
		[parseTime(constant.startYear), parseTime(constant.endYear)]);
	
	var line = d3.line()
		.curve(d3.curveMonotoneX)// curveLinear
		.x(function(d) { return allX(d.x); })
		.y(function(d) { return visibleY(d.y); });

	if (refreshType === RefreshType.YEAR) {
		plot.seriesPaths
			.transition() 
			.duration(plot.defaultTransitionDuration)
			.ease(plot.defaultTransitionEase)
			.on("end", function(d) { refresh(RefreshType.ALL); } )
			.attr("d", function(d) { return line(d.values); });
	}
	else {
		var seriesClass = "series"
		plot.svg
			.selectAll("." + seriesClass)
			.remove()

		plot.seriesPaths = plot.svg
			.selectAll("." + seriesClass)
			.data(data, function(d) { return d[weoColumn.countryCode] })
			.enter()
			.append("g")
			.attr("class", seriesClass)
			.selectAll("." + seriesClass)
			.data( function(d) { return [d] } )
			.enter()
			.append("path")

		plot.seriesPaths
			.attr("d", function(d) { return line(d.values); })
			.attr("clip-path", "url(#series-clip)")
			.attr("id", function(d) { return "series_" + d[weoColumn.countryCode] } )
			.style("fill", "none")
			.style("stroke", function(d) { return d.seriesColor })
			.style("stroke-width", plot.seriesStrokeWidth)
			.style("stroke-linejoin", "round")			
			.style("stroke-linecap", "round") 
			.style("opacity", plot.seriesStrokeOpacity)			
			.on("mouseover", function (d) { highlightSeries( d[weoColumn.countryCode], data ) })
			.on("mouseout", function (d) { unHighlightSeries( d[weoColumn.countryCode], data ) })
	}
}

function plotSeriesLegend(data, visibleY) {
	checkRequiredValue(data);
	checkRequiredValue(visibleY);

	var seriesLegendData = {
		nodes: data.map(function(d) {
			var x = width
			var y = visibleY(d.seriesLegendY)
			var v = { x: x, y: y, targetX: x, targetY: y, fx: x, seriesColor: d.seriesColor }
			v[weoColumn.country] = d[weoColumn.country]			
			v[weoColumn.countryCode] = d[weoColumn.countryCode]
			return v;
		})
	}

	// console.log("seriesLegendData:",seriesLegendData);

	if (plot.seriesLegendGroup == null) {
		plot.seriesLegendGroup = plot.svg.append("g")
	}
	
	plot.seriesLegendGroup.selectAll("*").remove()
	
	var seriesLegendText = plot.seriesLegendGroup.selectAll("text")
		.data(seriesLegendData.nodes)
	seriesLegendText.exit().remove()	
	seriesLegendText = seriesLegendText.enter().append('text')
		.attr("id", function(d) { return "seriesText_" + d[weoColumn.countryCode] } )	
		.style("font-family", plot.seriesTextFontFamily)
		.style("font-size", plot.seriesTextFontSize)
		.style("font-weight", plot.seriesTextFontWeight)
		.style("text-anchor", "left")
		.style("alignment-baseline", "central")
		.text( function(d) { return d[weoColumn.country] } )
		.on("mouseover", function (d) { highlightSeries( d[weoColumn.countryCode], data ) })
		.on("mouseout", function (d) { unHighlightSeries( d[weoColumn.countryCode], data ) })
	
	var seriesLegendMarker = plot.seriesLegendGroup.selectAll("circle")
		.data(seriesLegendData.nodes)
	seriesLegendMarker.exit().remove()	
	seriesLegendMarker = seriesLegendMarker.enter().append('circle')
		.attr("id", function(d) { return "seriesMarker_" + d[weoColumn.countryCode] } )
		.attr('r', plot.seriesMarkerRadius)
		.attr('fill', function(d) { return d.seriesColor } )
		.style("opacity", .75)
		.on("mouseover", function (d) { highlightSeries( d[weoColumn.countryCode], data ) })
		.on("mouseout", function (d) { unHighlightSeries( d[weoColumn.countryCode], data ) })

	var seriesLegendFlag = plot.seriesLegendGroup.selectAll("image")
		.data(seriesLegendData.nodes)
	seriesLegendFlag.exit().remove()	
	seriesLegendFlag = seriesLegendFlag.enter().append("svg:image")
		.attr('width', 20)
		.attr('height', 12) 
		.attr("xlink:href", function(d) { return "flags/" + d[weoColumn.countryCode] + ".png" })
		.on("mouseover", function (d) { highlightSeries( d[weoColumn.countryCode], data ) })
		.on("mouseout", function (d) { unHighlightSeries( d[weoColumn.countryCode], data ) })

	d3.forceSimulation(seriesLegendData.nodes)
    .alphaDecay(0.25)
	.force('collision', d3.forceCollide().radius(10).strength(1))
    .force('X', d3.forceX().x(function(d) { return d.targetX }))
    .force('Y', d3.forceY().y(function(d) { return d.targetY }))
    .on('tick', seriesLegendUpdate)

	function seriesLegendUpdate() {
		var xTextPos = 45,
			xMarkerPos = 10,
			xFlagPos = 20,
			yFlagPos = -6

		seriesLegendText
		.attr('x', function(d) { return d.x + xTextPos })
		.attr('y', function(d) { return d.y })
		seriesLegendMarker
		.attr('cx', function(d) { return d.x + xMarkerPos })
		.attr('cy', function(d) { return d.y })
		seriesLegendFlag
		.attr('x', function(d) { return d.x + xFlagPos })
		.attr('y', function(d) { return d.y + yFlagPos })
	}
}

// TODO: passing data to hide others
function highlightSeries(countryCode, data) {
	function highlightTransition(selection) {
		return selection
			.transition()
			.duration(plot.seriesHighlightTransitionDuration)
			.style("opacity", plot.seriesHighlightStrokeOpacity);
	}
	function unHighlightTransition(selection) {
		return selection
			.transition()
			.duration(plot.seriesHighlightTransitionDuration)
			.style("opacity", plot.seriesUnHighlightStrokeOpacity)
	}
	
	d3.select('#series_' + countryCode )
		.call(highlightTransition)
		.style("stroke-width", plot.seriesHighlightStrokeWidth)
	d3.select('#seriesMarker_' + countryCode )
		.call(highlightTransition)
		.attr('r', plot.seriesHighlightMarkerRadius)
	data.forEach(function(d) {
		if (countryCode !== d[weoColumn.countryCode]) {
			d3.select('#series_' + d[weoColumn.countryCode] )
				.call(unHighlightTransition)			
			d3.select('#seriesMarker_' + d[weoColumn.countryCode] )
				.call(unHighlightTransition)			
		}
	})
}

function unHighlightSeries(countryCode, data) {
	function unHighlightTransition(selection) {
		return selection
			.transition()
			.duration(plot.seriesHighlightTransitionDuration)
			.style("opacity", plot.seriesStrokeOpacity)
	}

	data.forEach(function(d) {
		d3.select('#series_' + d[weoColumn.countryCode] )
			.call(unHighlightTransition)
			.style("stroke-width", plot.seriesStrokeWidth) 
		d3.select('#seriesMarker_' + d[weoColumn.countryCode] )
			.call(unHighlightTransition)
			.attr('r', plot.seriesMarkerRadius)
	})
}


function getUniqueData(data, uniqueProperty, returnProperty) {
	checkRequiredValue(data, "array" );	
	checkRequiredValue(uniqueProperty, "string" );
	checkRequiredValue(returnProperty);
	if ( jQuery.type( returnProperty ) !== "array" ) {
		returnProperty = [ returnProperty ];
	}	
	var uniqueValues = [];
	var uniqueObjects = [];
	data.forEach(function(d) {
		if (d[uniqueProperty] != null && uniqueValues.indexOf(d[uniqueProperty]) === -1) {
			uniqueValues.push( d[uniqueProperty] );
			var uniqueObject = {};
			returnProperty.forEach(function(property) {
				uniqueObject[property] = d[property];
			});
            uniqueObjects.push( uniqueObject );
		}
	});
	return uniqueObjects;
}

function getSelectedData(data, property, values) {
	checkRequiredValue(data, "array" );	
	checkRequiredValue(property, "string" );
	checkRequiredValue(values);	
	if ( jQuery.type( values ) !== "array" ) {
		values = [ values ];
	}
	var objects = [];	
	data.forEach(function(d) {
		values.forEach(function(value) {
			if (d[property] != null && d[property] === value) {
				objects.push( d );
			}
		});
	});
	return objects;
}

function initSelector(id, data, selectedData, valueCallback, textCallback, options) {
	checkRequiredValue(id, "string");
	checkRequiredValue(data, "array");	

	if ( selectedData != null && jQuery.type( selectedData ) !== "array" ) {
		selectedData = [ selectedData ];
	}
	checkRequiredValue(valueCallback, "function" );	
	checkRequiredValue(textCallback, "function" );	
	checkOptionalValue(options, "object" );	
	var selector = $('#' + id);
	data.forEach( function(d) {
		var option =
		$('<option />', {
			value: valueCallback(d), 
			text: textCallback(d)
		});
		option.appendTo(selector);
	});
	if (selectedData != null ) {
		selector.val(selectedData.map(valueCallback));
	}
	if (options != null) {
		selector.select2(options);
	}
	else {
		selector.select2();
	}
	return selector;
}

function filterWeoDataBySubject(
	weoData,
	subjectSelection) {
	console.log("filterWeoDataBySubject");
	
	checkRequiredValue(weoData, "array" );	
	checkRequiredValue(subjectSelection, "object" );	

	var data = [];
	
	var subjectCode = subjectSelection[weoColumn.subjectCode];
	var subject = subjectSelection[weoColumn.subject];
	
	// console.log("filter subjectCode: ", subjectCode);

	var parseTime = d3.timeParse("%Y");
	weoData.forEach(function(d) {
        if (subjectCode == d[weoColumn.subjectCode]) {
			var countryCode = d[weoColumn.countryCode];			
			var country = d[weoColumn.country];
			var values = [];
			yearData.forEach(function(year) {
				var y = parseFloat( d[year].replace(/,/g,'') );
				if (!isNaN(y)) {
					values.push({ countryCode: countryCode, x: parseTime(year), y: y });
				}
			});
			if ( values.length > 0 ) {
				var seriesData = {};
				seriesData[weoColumn.countryCode] = countryCode;
				seriesData[weoColumn.country] = country;		
				seriesData[weoColumn.subjectCode] = subjectCode;
				seriesData[weoColumn.subject] = subject;		
				seriesData.values = values;
				data.push(seriesData);
			}
		};		
	});	
	return data;
}  

function filterSubjectDataByCountry(
	subjectData,
	countrySelection) {
	console.log("filterSubjectDataByCountry");	
	checkRequiredValue(subjectData);
	checkRequiredValue(countrySelection);	
	
	var data = null;
	
	var countryCode = countrySelection[weoColumn.countryCode];
	subjectData.forEach(function(d) {
		if (countryCode == d[weoColumn.countryCode]) {
			data = d;
		}
	});
	return data;
}  

function orderSubjectDataByValue(
	subjectData,
	fromYearSelection,
	toYearSelection,
	refreshType) {	
	console.log("orderSubjectDataByValue");
	checkRequiredValue(subjectData);
	checkRequiredValue(fromYearSelection);	
	checkRequiredValue(toYearSelection);	
	checkRequiredValue(refreshType);	

	subjectData.forEach(function(d) {
		var yValues = []
		d.values.forEach(function(d) {
			var year = d.x.getFullYear()
			if (year >= fromYearSelection &&
    			year <= toYearSelection) {
				yValues.push(d.y)
			}
		})
		d.minY = d3.min(yValues)
		d.maxY = d3.max(yValues)				
	})

	switch(refreshType) {
		case RefreshType.TOP:
			return subjectData.sort(function (a, b) {
				if (a.maxY > b.maxY) {return -1 }
				if (a.maxY < b.maxY) { return 1 }
				return 0
			});				
		case RefreshType.BOTTOM:
			return subjectData.sort(function (a, b) {
				if (a.minY < b.minY) {return -1 }
				if (a.minY > b.minY) { return 1 }
				return 0
			});
		default:
			return null;
	}
}

function checkRequiredValue(value, type) {
	if (value == null) {
		throw Error("Required value is missing" );
	}
	if (type != null) {
		if (jQuery.type( value ) !== type ) {
			throw Error("Required value is an " + jQuery.type( value ) + " instead of " + type );
		}
	}
}		

function checkOptionalValue(value, type) {
	if (value == null) {
		return;
	}
	if (type != null) {
		if (jQuery.type( value ) !== type ) {
			throw Error("Optional value is an " + jQuery.type( value ) + " instead of " + type );
		}
	}
}

/** Returns a list regions organised as single object with
 * UN (and other) region names as properties. Each region is 
 * associated with an array of ISO three letter country codes.
 * Source: http://unstats.un.org/unsd/methods/m49/m49regin.htm
 */
function initRegion() {
	var list = {
	"Eastern Africa": [
		"BDI", "COM", "DJI", "ERI", "ETH", "KEN", "MDG", 
		"MWI", "MUS",  "MOZ", "RWA", "SYC", "SSD", "UGA", 
		"TZA", "ZMB", "ZWE"],
	"Middle Africa": [
		"AGO", "CMR", "CAF", "TCD", "COD", "COD", "GNQ", 
		"GAB", "STP"],
	"Northern Africa": [
		"DZA", "EGY", "LBY", "MAR", "SDN", "TUN"],
	"Southern Africa": [
		"BWA", "LSO", "NAM", "ZAF", "SWZ"],
	"Western Africa": [
		"BEN", "BFA", "CPV", "CIV", "GMB", "GHA", "GNQ", 
		"GNB", "LBR", "MLI", "MRT", "NER", "NGA", "SEN", 
		"SLE", "TGO"],
	"Caribbean": [
		"ATG", "BHS", "BRB", "DMA", "DOM", "GRD", "HTI", 
		"JAM", "PRI", "TTO"],
	"Central America": [
		"BLZ", "CRI", "SLV", "GTM", "HND", "MEX", "NIC", 
		"PAN"],
	"South America": [
		"ARG", "BOL", "BRA", "CHL", "COL", "ECU", "GUY", 
		"PRY", "PER", "SUR", "URY", "VEN"],
	"Northern America": [
		"CAN", "USA"],
	"Central Asia": [
		"KAZ", "TJK", "TKM", "UZB"],
	"Eastern Asia": [
		"CHN", "HKG", "MAC", "KOR", "JPN", "MNG"],
	"Southern Asia": [
		"AFG", "BGD", "BTN", "IND", "IRN", "MDV", "NPL", 
		"PAK", "LKA"],
	"South-Eastern Asia": [
		"BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", 
		"SGP", "THA", "TLS", "VNM"],
	"Western Asia": [
		"ARM", "AZE", "BHR", "CYP", "GEO", "IRQ", "ISR", 
		"JOR", "KWT", "LBN", "OMN", "QAT", "SAU", "SYR", 
		"TUR", "ARE", "YEM"],
	"Eastern Europe": [
		"BLR", "BGR", "CZE", "HUN", "POL", "MDA", "ROU", 
		"RUS", "SVK", "UKR"],
	"Northern Europe": [
		"DNK", "EST", "FIN", "ISL", "IRL", "LVA", "LTU", 
		"NOR", "SWE", "GBR"],
	"Nordic Countries": [
		"SWE", "NOR", "ISL", "FIN", "DNK" ],		
	"Southern Europe": [
		"ALB", "BIH", "HRV", "GRC", "ITA", "MLT", "MNE", 
		"PRT", "SMR", "SRB", "SVN", "ESP", "MKD"],
	"Western Europe": [
		"AUT", "BEL", "FRA", "DEU", "LUX", "NLD", "CHE"],
	"Australia and New Zealand": [
		"AUS", "NZL"],
	"Melanesia": [
		"FJI", "PNG", "SLB", "VUT"],
	"Micronesia": [
		"KIR", "MHL", "FSM", "PLW"],
	"Polynesia": [
		"WSM", "TON", "TUV"],
	"Opec Countries": [
		"DZA", "AGO", "ECU", "IRN", "IRQ", "KWT", "LBY", 
		"NGA", "QAT", "SAU", "ARE", "VEN"],
	"G8 Countries": [
		"JPN","RUS","USA","GBR","ITA","DEU","CAN","FRA"],	
	"BRICS Countries": [
		"RUS","CHN", "IND", "BRA", "ZAF"]	
	}
	return list;
}
